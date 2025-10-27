const bcrypt = require('bcryptjs');

const storedHash = '$2b$10$ZbfSF0qI1ji3/lTQ4Bqaae804jLQJY8huhICob.2YO0m23GuszWde';
const passwordToTest = 'SuperAdmin123!';

console.log('Testing password against stored hash...\n');

bcrypt.compare(passwordToTest, storedHash)
  .then((isMatch) => {
    if (isMatch) {
      console.log('✅ Password "SuperAdmin123!" matches the hash!');
    } else {
      console.log('❌ Password "SuperAdmin123!" does NOT match the hash');
      console.log('\nTrying some common passwords...');

      const commonPasswords = [
        'admin',
        'Admin123',
        'admin123',
        'password',
        'Password123',
        'SuperAdmin123',
        'superadmin123',
        'Admin@123'
      ];

      Promise.all(
        commonPasswords.map(pwd =>
          bcrypt.compare(pwd, storedHash).then(match => ({ pwd, match }))
        )
      ).then(results => {
        const match = results.find(r => r.match);
        if (match) {
          console.log(`✅ Found match: "${match.pwd}"`);
        } else {
          console.log('❌ None of the common passwords matched');
          console.log('\nTo reset the password, I can generate a new hash...');
        }
      });
    }
  })
  .catch(err => {
    console.error('Error:', err);
  });
