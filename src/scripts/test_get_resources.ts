async function testGetResources() {
  try {
    const res = await fetch('http://localhost:5000/api/resources');
    const json = await res.json();
    console.log('GET /api/resources HTTP Status:', res.status);
    console.log('GET /api/resources Response Payload:', JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

testGetResources();
