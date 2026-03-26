const pool = require('./config');

const query = `
CREATE TABLE IF NOT EXISTS notification (
  notification_id SERIAL PRIMARY KEY,
  person_id INT NOT NULL REFERENCES consumer(person_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  dot_color VARCHAR(50) DEFAULT 'bg-txt/30',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(query)
  .then(() => {
    console.log('Notification table created successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error creating notification table:', err);
    process.exit(1);
  });
