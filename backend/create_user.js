const bcrypt = require("bcrypt");
const pool = require('./db/config');// your existing db.js

const createUser = async (email, password, role) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    const result = await pool.query(
      `INSERT INTO ACCOUNT (person_id, account_type, email, password_hashed, is_active, created_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())`,
      [1, role, email, hashedPassword]
    );

    console.log("User created with hashed password");
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

//createUser("john.doe@example.com", "12345678", "consumer");
//createUser("john.doe@example.com", "employee", "employee");
createUser("adnath@example.com", "12345678", "employee");
