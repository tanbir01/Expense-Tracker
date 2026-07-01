const prisma = require("../db");

exports.upsertSetting = async (req, res) => {
  const userId = req.userId;
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ message: "Key and value are required." });
  }

  try {
    const setting = await prisma.setting.upsert({
      where: {
        key, // unique key constraint
      },
      update: {
        userId,
        value: String(value),
      },
      create: {
        userId,
        key,
        value: String(value),
      },
    });

    res.json(setting);
  } catch (error) {
    console.error("Upsert setting error:", error);
    res.status(500).json({ message: "Server error updating setting." });
  }
};

exports.getSettings = async (req, res) => {
  const userId = req.userId;

  try {
    const settings = await prisma.setting.findMany({
      where: { userId },
    });

    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: "Server error fetching settings." });
  }
};

exports.getPublicConfig = async (req, res) => {
  try {
    let serviceAccountEmail = "";
    if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
      serviceAccountEmail = creds.client_email || "";
    }
    res.json({
      serviceAccountEmail,
    });
  } catch (error) {
    console.error("Error fetching service account email:", error);
    res.json({ serviceAccountEmail: "" });
  }
};
