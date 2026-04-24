function handleScroll() {
    var e = document.getElementsByClassName("support-floating")[0],
        t = document.getElementsByClassName("botaoflutuante")[0], n = document.getElementById("evolution-price-list"),
        o = null;
    t && (o = window.getComputedStyle(t)), e && n && (e.style.bottom = null != o && "block" === o.display ? "65px" : "15px")
}

function increaseValue() {
    var e = parseInt(document.getElementById("number").value, 10);
    e = isNaN(e) ? 0 : e, e++, document.getElementById("number").value = e
}

function decreaseValue() {
    var e = parseInt(document.getElementById("number").value, 10);
    1 !== (e = isNaN(e) ? 0 : e) && e--, document.getElementById("number").value = e
}

function serialize(e) {
    function t(e, n) {
        var o = e.lastIndexOf("[");
        if (-1 === o) {
            var a = {};
            return a[e] = n, a
        }
        var i = e.substr(0, o), r = {};
        return r[e.substring(o + 1, e.length - 1)] = n, t(i, r)
    }

    for (var n = {}, o = 0, a = e.elements.length; o < a; o++) {
        var i = e.elements[o];
        if ("" !== i.name && !i.disabled) if (i.name && !i.disabled && (i.checked || /select|textarea/i.test(i.nodeName) || /hidden|text|search|tel|url|email|password|datetime|date|month|week|time|datetime-local|number|range|color/i.test(i.type))) n = extend(n, t(i.name, i.value))
    }
    return n
}

function extend() {
    for (var e = {}, t = 0, n = function (t) {
        for (var n in t) t.hasOwnProperty(n) && ("[object Object]" === Object.prototype.toString.call(t[n]) ? e[n] = Form.extend(e[n], t[n]) : e[n] = t[n])
    }; t < arguments.length; t++) n(arguments[t]);
    return e
}

window.onload = function () {
    if (window.matchMedia("(max-width: 768px)").matches) {
        handleScroll(), window.onscroll = handleScroll;
        var e = document.getElementsByClassName("support-floating")[0],
            t = document.getElementsByClassName("botaoflutuante")[0], n = null;
        t && (n = window.getComputedStyle(t)), e && null != n && "block" === n.display && (e.style.bottom = "65px")
    }
}, $(".block-swatch__radio, .variant-swatch__radio, .product-form__single-selector").change((function () {
    setTimeout((function () {
        parcelamento()
    }), 150)
})), $(".options:first-child").addClass("active"), $(".options").each((function () {
    $(this).on("click", (function () {
        $(".options").removeClass("active"), $(this).addClass("active"), $("#evolution-price-list .price-promotional-wrap strong").html($(this).find(".valortot").text()), $("#evolution-price-list .price-promotional-wrap span").html($(this).find(".valorcomp").text()), $("#evolution-price-list .price-promotional-wrap .selector-desconto").remove(), $("#evolution-price-list .price-promotional-wrap").append('<p class="selector-desconto">CUPOM ' + $(this).find(".saving").text() + " APLICADO</p>"), parcelamento()
    }))
})), $(".product-form").each((function () {
    $(this).on("click", ".botaocmprar, .botaoaddcarrinho-qtd", (function (e) {
        e.stopImmediatePropagation();
        const t = "botaoaddcarrinho" === $(this).attr("id") || !window.theme.botaoaddcarrinho, n = [],
            o = parseInt($(".options.active .iddavariante").attr("val")),
            a = parseInt($(".options.active .iddavariante").attr("qtd"));
        n.push({id: o, quantity: a}), $(".buy-together-list input").each((function () {
            !0 === $(this).prop("checked") && n.push({id: $(this).attr("data-id"), quantity: 1})
        }));
        let i = {items: n};
        fetch("".concat(window.routes.cartAddUrl, ".js"), {
            body: JSON.stringify(i),
            credentials: "same-origin",
            method: "POST",
            headers: {"Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest"}
        }).then((function (e) {
            if (e.ok) if ("drawer" === window.theme.cartType && t) {
                document.dispatchEvent(new CustomEvent("theme:loading:end"));
                const e = document.querySelector('[data-section-id="product-template"]');
                e && e.dispatchEvent(new CustomEvent("product:added", {
                    bubbles: !0,
                    detail: {variant: n[1], quantity: 1}
                }))
            } else setTimeout((function () {
                window.location.href = "/cart"
            }), 500)
        }))
    }))
}));
const youtubeVideos = [...document.querySelectorAll("[data-youtube]")];
youtubeVideos.forEach((function (e) {
    e.querySelector("[data-youtube-button]").addEventListener("click", (function () {
        const e = event.target.dataset.youtubeButton, t = event.target.parentNode,
            n = '<iframe width="100%" src="' + e + '?autoplay=1&showinfo=0&controls=1&rel=0&modestbranding=1" allow="autoplay;" frameborder="0" allowfullscreen></iframe>';
        t.style.display = "none", t.insertAdjacentHTML("beforebegin", n), t.parentNode.removeChild(t)
    }))
})), $(document).ready((function () {
    (function (e, t) {
        t || (t = window.location.href), e = e.replace(/[\[\]]/g, "\\$&");
        var n = new RegExp("[?&]" + e + "(=([^&#]*)|&|#|$)").exec(t);
        return n ? n[2] ? decodeURIComponent(n[2].replace(/\+/g, " ")) : "" : null
    })("customer_posted") && $(".modal--newsletter").attr("aria-hidden", "false");
    const e = document.getElementById("copiar-cupom");
    e && e.addEventListener("click", (function () {
        var e = document.getElementById("texto-cupom");
        navigator.clipboard && navigator.clipboard.writeText(e.innerText).then((function () {
        })).catch((function (e) {
        }))
    }))
}));
const miniCart = document.querySelector(".mini-cart");
let observer = null;

function handleMutation(e, t) {
    for (const t of e) if ("aria-hidden" === t.attributeName) {
        const e = "true" === t.target.getAttribute("aria-hidden");
        document.documentElement.style.overflow = e ? "auto" : "hidden"
    }
}

function startObserver() {
    (observer = new MutationObserver(handleMutation), observer.observe(miniCart, {
        attributes: !0,
        attributeFilter: ["aria-hidden"]
    }))
}

function stopObserver() {
    observer && (observer.disconnect(), observer = null)
}

window.addEventListener("load", startObserver), window.addEventListener("resize", (function () {
    startObserver()
}));

