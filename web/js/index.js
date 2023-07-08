function GlobalInit() {
    if (localStorage.getItem("X-APINATOR-AUTH") == "") {
        document.querySelector(".signinpopup").style.display = "block";
        logininit();
    } else {

    }
}

function logininit() {
    var button = document.getElementById("signinButton");
    var input = document.getElementById("signinValue");

    button.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();

        var value = input.value;
        localStorage.setItem("X-APINATOR-AUTH", value);

        document.querySelector(".signinpopup").style.display = "none";
    });
}