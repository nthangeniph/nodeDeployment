const dotenv = require("dotenv");
dotenv.config({ path: "../../.env" });

function getDevConfig() {
  return {
    airtableId: process.env.AIRTABLE_BASE_ID,
    airtableApiKey: process.env.AIRTABLE_API_KEY,
    pat: process.env.AZURE_PERSONAL_ACCESS_TOKEN,
    username: process.env.AZURE_USERNAME,
  };
}

function airtableSetup() {
  const Airtable = require("airtable");
  const base = new Airtable({ apiKey: getDevConfig().airtableApiKey }).base(getDevConfig().airtableId);
  return base;
}

function devopsSetup() {
  const username = getDevConfig().username;
  const password = getDevConfig().pat;
  const authorizationHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  return authorizationHeader;
}

module.exports = {
  getDevConfig,
  airtableSetup,
  devopsSetup,
};
