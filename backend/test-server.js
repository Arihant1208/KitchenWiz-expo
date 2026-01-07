const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('✅ Server is running!');
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('❌ Server is not running:', error.message);
});

req.end();
