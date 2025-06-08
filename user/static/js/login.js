const loginform = document.querySelector('#loginForm')

loginform.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
  
    if (username && password) {
      loginform.submit();
      alert('Login successful!');
      // You can add actual backend validation here
    } else {
      alert('Please fill in all fields.');
    }
  });
  