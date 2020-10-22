// function setup() {


const message = document.getElementById('caption').value;

document.getElementById('caption').value = "";


const data = {
    message: message
};

fetch('/api', {
    method: 'POST',
    body: JSON.stringify({
        message: message
    }),
    headers: {
        'Content-Type': 'application/json'
    }
}).then(function(res) {
    return res.json();
})


// });