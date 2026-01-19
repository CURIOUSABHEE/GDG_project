const express = require("express");
const router = express.Router();
const User = require("../../models/firestore/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const rpID = process.env.RP_ID || "localhost";
const origin = (process.env.ORIGIN || "http://localhost:5173").replace(
  /\/$/,
  "",
);

// --- Registration ---

router.post("/register/options", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    let user = await User.findOne({ username });

    if (!user) {
      user = await User.create({ username, authenticators: [] });
    }

    const options = await generateRegistrationOptions({
      rpName: process.env.RP_NAME || "Linko",
      rpID,
      userID: new TextEncoder().encode(user.id.toString()),
      userName: user.username,
      attestationType: "none",
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (error) {
    console.error("Registration options error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/register/verify", async (req, res) => {
  const { username, response } = req.body;
  const user = await User.findOne({ username });

  if (!user || !user.currentChallenge) {
    return res
      .status(400)
      .json({ error: "User not found or no challenge waiting" });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: req.headers.origin || origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (error) {
    console.error("Registration verification error:", error);
    return res.status(400).json({ error: error.message });
  }

  if (verification.verified && verification.registrationInfo) {
    const { credentialPublicKey, credentialID, counter } =
      verification.registrationInfo;

    const newAuthenticator = {
      credentialID: Buffer.from(credentialID).toString("base64"),
      credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
      credentialDeviceType: verification.registrationInfo.credentialDeviceType,
      credentialBackedUp: verification.registrationInfo.credentialBackedUp,
      transports: response.response.transports || [],
    };

    user.authenticators.push(newAuthenticator);
    user.currentChallenge = null;
    await user.save();

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ verified: true, token });
  } else {
    res.status(400).json({ verified: false });
  }
});

// --- Login ---

router.post("/login/options", async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!user.authenticators || user.authenticators.length === 0) {
      return res.status(400).json({
        error:
          "No authenticators registered for this user. Please create an account first.",
      });
    }

    const validCredentials = user.authenticators
      .filter((auth) => auth.credentialID && auth.credentialID.length > 0)
      .map((auth) => ({
        id: auth.credentialID
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, ""),
        type: "public-key",
        transports: auth.transports || [],
      }));

    if (validCredentials.length === 0) {
      return res.status(400).json({
        error: "No valid authenticators found. Please register again.",
      });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: validCredentials,
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (error) {
    console.error("Login options error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate login options" });
  }
});

router.post("/login/verify", async (req, res) => {
  const { username, response } = req.body;
  const user = await User.findOne({ username });

  if (!user || !user.currentChallenge) {
    return res.status(400).json({ error: "User not found or no challenge" });
  }

  const bodyCredID = response.id;

  const foundAuth = user.authenticators.find((auth) => {
    const currentBase64URL = auth.credentialID
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return currentBase64URL === bodyCredID;
  });

  if (!foundAuth) {
    return res.status(400).json({ error: "Authenticator not found" });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(foundAuth.credentialID, "base64"),
        credentialPublicKey: Buffer.from(
          foundAuth.credentialPublicKey,
          "base64",
        ),
        counter: foundAuth.counter,
        transports: foundAuth.transports,
      },
      requireUserVerification: false,
    });
  } catch (error) {
    console.error("Login verification error:", error);
    return res.status(400).json({ error: error.message });
  }

  if (verification.verified) {
    const { authenticationInfo } = verification;

    // Update counter
    foundAuth.counter = authenticationInfo.newCounter;
    user.currentChallenge = null;
    await user.save();

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({ verified: true, token });
  } else {
    res.status(400).json({ verified: false });
  }
});

// --- Password Auth ---

router.post("/register/password", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({ username, password: hashedPassword });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({ token, username });
  } catch (error) {
    console.error("Password registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login/password", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const user = await User.findOneWithPassword({ username });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({ token, username });
  } catch (error) {
    console.error("Password login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
