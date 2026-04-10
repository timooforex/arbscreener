const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key:    { type: String, unique: true, required: true },
  value:  { type: mongoose.Schema.Types.Mixed, required: true },
});

const Settings = mongoose.model('Settings', settingsSchema);

// Helper to get a setting value
Settings.get = async function(key, defaultValue = null) {
  const doc = await Settings.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// Helper to set a setting value
Settings.set = async function(key, value) {
  return Settings.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
};

module.exports = Settings;
