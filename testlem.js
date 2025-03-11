async function lemmatizeText(input, callback) {
  const fetch = await import('node-fetch').then(mod => mod.default);

  fetch('http://127.0.0.1:5000/lemmatize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: input })
  })
  .then(response => response.json())
  .then(data => {
    callback(data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

// example
lemmatizeText('', (result) => {
  console.log('Lematyzowane wyniki:', result);
});