const dotenv = require("dotenv");
const { Resend } = require("resend");

dotenv.config();

const { PORT, MONGODB_URI, SESSION_SECRET, RESEND_API_KEY, RESEND_FROM } = process.env;

module.exports = {
  PORT,
  MONGODB_URI,
  SESSION_SECRET,
  RESEND_API_KEY,
  RESEND_FROM,
  resend: RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null
};
