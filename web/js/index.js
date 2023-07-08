function GlobalInit() {
    if (localStorage.getItem("X-APINATOR-AUTH") == "") {
        window.location.href = "/login.html"
    }
}

function LoginInit() {
    var button = document.getElementById("login");
    var input = document.getElementById("mdp");

    button.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();

        var value = input.value;
        localStorage.setItem("X-APINATOR-AUTH", value);

        window.location.href = "/"
    });
}