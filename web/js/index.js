function GlobalInit() {
    if (localStorage.getItem("X-APINATOR-AUTH") == "") {
        document.querySelector(".signinpopup").style.display = "block";
        logininit();
    } else {
        boxedMonaco.create(document.querySelector('.livecode'), {
            value: `package main
import (
    "fmt"
)

func main() {
    fmt.Println("Hello, world")
}`,
            language: 'golang'
        });
    }
}

function logininit() {
    var button = document.getElementById("signinButton");
    var input = document.getElementById("signinValue");

    button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var value = input.value;
        localStorage.setItem("X-APINATOR-AUTH", value);

        document.querySelector(".signinpopup").style.display = "none";
    });
}