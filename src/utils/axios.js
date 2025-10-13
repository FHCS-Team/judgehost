const axios = require("axios");

const instance = axios.create({
  baseURL: process.env.AXIOS_BASE_URL || "",
  timeout: 10000,
  // You can add more config here, e.g., headers, auth, etc.
});

module.exports = instance;
