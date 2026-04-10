const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb+srv://timothyheritage4_db_user:SP4UjovsUSoEMV8B@arbitrage.brdvwig.mongodb.net/arbscreener?retryWrites=true&w=majority')
  .then(async () => {
    await User.create({
      email: 'timothyheritage4@gmail.com',
      password: 'Tomzgold@001',
      role: 'admin',
      plan: 'pro',
      planActive: true
    });
    console.log('Admin created!');
    process.exit();
  })
  .catch(err => { console.error(err.message); process.exit(1); });
