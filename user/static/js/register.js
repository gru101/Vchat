const registratioFrom = document.querySelector('#registerForm');
const error = document.querySelector('.error-message');
const success = document.querySelector('.success-message');
const password = document.querySelector('#password');
const passwordchecks = document.querySelector('.PasswordChecks');
const lengthcheck = document.querySelector("#lengthCheck");
const uppercasecheck = document.querySelector("#upperCaseCheck");
const lowercasecheck = document.querySelector("#lowerCaseCheck");
const numbercheck = document.querySelector("#numberCheck");
const spcheck = document.querySelector("#spCheck");
const PasswordChecks = document.querySelector(".PasswordChecks");


document.querySelector("#username").addEventListener("input", (e) => {
  const input = e.target;
  input.value = input.value.replace(/\s+/g, "");
});

document.querySelector("#firstName").addEventListener("input", (e) => {
  const input = e.target;
  input.value = input.value.replace(/\s+/g, "");
});

document.querySelector("#lastName").addEventListener("input", (e) => {
  const input = e.target;
  input.value = input.value.replace(/\s+/g, "");
});

document.querySelector("#password").addEventListener("input", (e) => {
  const input = e.target;
  input.value = input.value.replace(/\s+/g, "");
});

document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM fully loaded and parsed");
});

function uppercase(str) {
  let counter = 0;
  for(let char of str) {
      if (char == char.toUpperCase()) {
          counter++;
      }
  }
  return counter >= 3
}

function lowercase(str) {
  let counter = 0;
  for(let char of str) {
      if (char == char.toLowerCase()) {
          counter++;
      }
  }
  return counter >= 3
}

function isSpecialChar(str) {
  const spChar = (char) => {return /[^a-zA-Z0-9]/.test(char)};
  let counter = 0;
  for(let char of str) {
      if (spChar(char)) {
          counter++;
      }
  }
  return counter >= 1;
}

function isNumber(str) { 
  const isNum = (char) => { return /[0-9]/.test(char)};
  let counter = 0;
  for(let char of str) {
      if (isNum(char)) {
          counter++;
      }
  }
  return counter >= 1;
}

if (error) {
  error.classList.remove("Show");
} else {
  error.classList.add("Show");
}

if (success) {
  success.classList.remove("Show");
} else {
  success.classList.add("Show");
}

let AccepteblePassword = true;

password.addEventListener("input", function() {
  PasswordChecks.classList.remove("Show");
  const value = password.value;

    let length = false;
    let upper = false;
    let lower = false;
    let num = false;
    let sp = false;

    if (value.length >= 8) {
        lengthcheck.style.color = "green"
        length = true;
    } else {
        lengthcheck.style.color = "red"
    }

    if (uppercase(value)) {
        uppercasecheck.style.color = "green"
        upper = true;

    } else {
        uppercasecheck.style.color = "red"
    }

    if (lowercase(value)) {
        lowercasecheck.style.color = "green"
        lower = true;
    } else {
        lowercasecheck.style.color = "red"
    }

    if (isNumber(value)) {
        numbercheck.style.color = "green"
        num = true;
    } else {
        numbercheck.style.color = "red"
    }

    if (isSpecialChar(value)) {
        spcheck.style.color = "green"
        sp = true;
    } else {
        spcheck.style.color = "red"
    }

    if (length && upper && lower && num && sp) {
        AccepteblePassword = true;
        PasswordChecks.classList.add("Show")
    }

    console.log("password checks")
  });

  registratioFrom.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
    
      if (username && password && firstName && lastName && AccepteblePassword) {
        registratioFrom.submit();
        // You can add actual backend call here    
      } else {
        alert('Please fill in all fields.');
      }
    });


    










if (window.matchMedia("(max-width: 427px)").matches) {
  if (error) {
    error.classList.remove("Show");
  }
  
  let AccepteblePassword = true;
  
  password.addEventListener("input", function() {
    PasswordChecks.classList.remove("Hide");
    const value = password.value;
    let length = false;
    let upper = false;
    let lower = false;
    let num = false;
    let sp = false;
  
    if (value.length >= 8) {
        lengthcheck.style.color = "green"
        length = true;
    } else {
        lengthcheck.style.color = "red"
    }
  
    if (uppercase(value)) {
        uppercasecheck.style.color = "green"
        upper = true;
  
    } else {
        uppercasecheck.style.color = "red"
    }
  
    if (lowercase(value)) {
        lowercasecheck.style.color = "green"
        lower = true;
    } else {
        lowercasecheck.style.color = "red"
    }
  
    if (isNumber(value)) {
        numbercheck.style.color = "green"
        num = true;
    } else {
        numbercheck.style.color = "red"
    }
  
    if (isSpecialChar(value)) {
        spcheck.style.color = "green"
        sp = true;
    } else {
        spcheck.style.color = "red"
    }
  
    if (length && upper && lower && num && sp) {
        AccepteblePassword = true;
        PasswordChecks.classList.add("Show")
    }
    console.log("password checks")
  });
  
  
  registratioFrom.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
    
      if (username && password && firstName && lastName && AccepteblePassword) {
        registratioFrom.submit();
        // You can add actual backend call here    
      } else {
        alert('Please fill in all fields.');
      }
    }); 
}