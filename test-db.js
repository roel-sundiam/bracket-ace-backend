const { MongoClient } = require('mongodb');

async function checkData() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('bracketace');
    
    const user = await db.collection('users').findOne({ email: 'sundiamr@aol.com' });
    
    if (user) {
      console.log('\n=== USER INFO ===');
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('User ID:', user._id.toString());
      
      const clubs = await db.collection('clubs').find({ 
        clubAdminId: user._id 
      }).toArray();
      
      console.log('\n=== CLUBS ===');
      console.log('Total clubs where user is admin:', clubs.length);
      clubs.forEach(club => {
        console.log('\nClub:');
        console.log('  Name:', club.name);
        console.log('  ID:', club._id.toString());
        console.log('  Active:', club.isActive);
        console.log('  Admin ID:', club.clubAdminId.toString());
      });
    } else {
      console.log('User not found!');
    }
    
  } finally {
    await client.close();
  }
}

checkData().catch(console.error);
