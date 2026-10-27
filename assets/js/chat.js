// "Fråga oss": a small assistant in the corner. It answers from our own FAQ and prices,
// and passes anything it cannot answer on to info@elevatestudio.nu.
(function () {
  var prefix = document.currentScript.dataset.prefix || '';
  var endpoint = document.currentScript.dataset.endpoint;
  var KB = [
    { k: ['kost', 'pris', 'billig', 'dyr', 'kronor', 'betala', 'avgift'],
      a: 'Starter kostar 3 000 kr och Pro 6 000 kr i startavgift, plus en årsavgift (99–199 kr/år för Starter, 299–399 kr/år för Pro). Större projekt får ett fast pris i en offert. Alla priser är exkl. moms.',
      link: ['Se priser', 'priser.html'] },
    { k: ['tid', 'lång', 'snabb', 'färdig', 'vecka', 'månad', 'leverans', 'när'],
      a: 'Räkna med ungefär en månad från beställning till färdig sajt, förutsatt att vi har fått texter, bilder och åtkomst. Själva designen och bygget tar oftast 1–2 veckor.' },
    { k: ['tjänst', 'erbjud', 'gör ni', 'vad gör', 'hjälp med'],
      a: 'Vi bygger hemsidor och kopplar på bokningssystem, offertsystem och AI-chatt. Vi jobbar också med SEO och AI-optimering, och tar hand om support och underhåll efteråt.',
      link: ['Se alla tjänster', 'tjanster/index.html'] },
    { k: ['boka', 'bokning', 'kalender'],
      a: 'Ja, vi kan bygga in bokning så att kunderna väljer en tid direkt på hemsidan – med notiser till er via e-post och SMS.',
      link: ['Om bokningssystem', 'tjanster/bokningssystem.html'] },
    { k: ['offert', 'förfrågan', 'forfragan'],
      a: 'Med ett offertflöde beskriver kunden jobbet steg för steg, så att ni får en komplett förfrågan. Våra egna offerter är på två sidor med fast pris.',
      link: ['Se ett exempel på avtal', 'avtal.html'] },
    { k: ['ai', 'chatt', 'chatbot', 'bot'],
      a: 'Vi bygger AI-chattar som svarar på kundernas vanliga frågor dygnet runt och skickar vidare förfrågningar till er.',
      link: ['Om AI-chatt', 'tjanster/ai-chatt.html'] },
    { k: ['google', 'seo', 'synas', 'hittar', 'sök'],
      a: 'Grundläggande SEO och AI-optimering ingår i alla hemsidor vi bygger, så att ni går att hitta både på Google och i AI-tjänster.',
      link: ['Om SEO och AI-optimering', 'tjanster/seo-och-ai-optimering.html'] },
    { k: ['support', 'ändr', 'uppdater', 'underhåll', 'efter'],
      a: 'Under första året ingår upp till 10 timmars support och redigering per månad – till exempel text- och bildändringar eller nya funktioner.' },
    { k: ['domän', 'äger', 'hosting', 'webbhotell'],
      a: 'Domänen är och förblir er. Hosting och eventuella externa avgifter står specificerade i offerten.' },
    { k: ['var finns', 'var ligger', 'uppsala', 'stockholm', 'ort', 'distans', 'sverige'],
      a: 'Vi finns i Uppsala och jobbar med företag i hela Sverige – möten går lika bra på distans.' },
    { k: ['kontakt', 'ring', 'telefon', 'mejl', 'mail', 'prata', 'möte'],
      a: 'Ring Carl på 076-022 83 61 eller mejla info@elevatestudio.nu. Du kan också fylla i formuläret, så hör vi av oss så fort vi kan.',
      link: ['Kontakta oss', 'kontakt.html'] }
  ];
  var CHIPS = ['Vad kostar det?', 'Hur lång tid tar det?', 'Vad gör ni?', 'Prata med någon'];

  var root = document.createElement('div');
  root.className = 'chat';
  root.innerHTML =
    '<button type="button" class="chat__toggle" aria-expanded="false" aria-controls="chat-panel">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor"/></svg>' +
      '<span>Frågor?</span></button>' +
    '<section class="chat__panel" id="chat-panel" aria-label="Fråga Elevate Studio" hidden>' +
      '<header class="chat__head"><div><p class="chat__title">Fråga oss</p><p class="chat__sub">Snabba svar från vår FAQ – eller ett svar från oss via mejl.</p></div>' +
      '<button type="button" class="chat__close" aria-label="Stäng">×</button></header>' +
      '<div class="chat__log" aria-live="polite"></div>' +
      '<div class="chat__chips"></div>' +
      '<form class="chat__form"><label class="sr-only" for="chat-input">Din fråga</label>' +
      '<input id="chat-input" type="text" autocomplete="off" placeholder="Skriv en fråga …"><button type="submit" aria-label="Skicka">' +
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></form>' +
    '</section>';
  document.body.appendChild(root);

  var toggle = root.querySelector('.chat__toggle'), panel = root.querySelector('.chat__panel');
  var log = root.querySelector('.chat__log'), chips = root.querySelector('.chat__chips');
  var form = root.querySelector('.chat__form'), input = root.querySelector('#chat-input');
  var waitingForEmail = null, greeted = false;

  var LOGO = '<svg viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>';
  var queue = Promise.resolve();
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function row(who) {
    var r = document.createElement('div');
    r.className = 'chat__row chat__row--' + who;
    if (who === 'bot') { var av = document.createElement('span'); av.className = 'chat__avatar'; av.innerHTML = LOGO; r.appendChild(av); }
    log.appendChild(r);
    return r;
  }
  // Bot messages wait their turn and show "skriver …" first, a little longer for longer answers
  function say(text, who, link) {
    if (who !== 'bot') return show(text, who, link);
    queue = queue.then(function () {
      var r = row('bot');
      var dots = document.createElement('div');
      dots.className = 'chat__msg chat__msg--bot chat__typing';
      dots.setAttribute('aria-label', 'Skriver');
      dots.innerHTML = '<i></i><i></i><i></i>';
      r.appendChild(dots);
      log.scrollTop = log.scrollHeight;
      var wait = reduced ? 0 : Math.min(1800, 550 + text.length * 6);
      return new Promise(function (ok) { setTimeout(ok, wait); }).then(function () { r.remove(); show(text, 'bot', link); });
    });
    return queue;
  }
  function show(text, who, link) {
    var r = row(who);
    var m = document.createElement('div');
    m.className = 'chat__msg chat__msg--' + who;
    m.textContent = text;
    if (link) {
      var a = document.createElement('a');
      a.href = prefix + link[1];
      a.textContent = link[0] + ' →';
      m.appendChild(document.createElement('br'));
      m.appendChild(a);
    }
    r.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }
  function open(state) {
    panel.hidden = !state;
    toggle.setAttribute('aria-expanded', String(state));
    root.classList.toggle('chat--open', state);
    if (state && !greeted) {
      greeted = true;
      say('Hej! Vad undrar du? Välj en fråga nedan eller skriv själv.', 'bot');
      CHIPS.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = c;
        b.addEventListener('click', function () { ask(c); });
        chips.appendChild(b);
      });
    }
    if (state) input.focus();
  }
  function answer(q) {
    var t = q.toLowerCase(), words = t.split(/[^a-z0-9åäöé]+/), best = null, score = 0;
    var hits = function (k) {
      if (k.indexOf(' ') !== -1) return t.indexOf(k) !== -1;
      return words.some(function (w) { return w.indexOf(k) === 0; });
    };
    KB.forEach(function (e) {
      var s = e.k.filter(hits).length;
      if (s > score) { score = s; best = e; }
    });
    return best;
  }
  function ask(q) {
    say(q, 'me');
    if (waitingForEmail) {
      var email = q.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { say('Det ser inte ut som en e-postadress. Försök igen, eller mejla info@elevatestudio.nu.', 'bot'); return; }
      var question = waitingForEmail; waitingForEmail = null;
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: 'Fråga från chatten på hemsidan', _template: 'table', email: email, fraga: question, sida: location.href }) })
        .then(function (r) { if (!r.ok) throw new Error(); say('Tack! Vi svarar dig på ' + email + ' så fort vi kan.', 'bot'); })
        .catch(function () { say('Något gick fel. Mejla gärna info@elevatestudio.nu direkt.', 'bot'); });
      return;
    }
    if (/prata med någon|människa|person/i.test(q)) {
      say('Absolut! Ring Carl på 076-022 83 61 eller mejla info@elevatestudio.nu. Vill du att vi hör av oss? Skriv din e-postadress här.', 'bot');
      waitingForEmail = 'Vill bli kontaktad';
      return;
    }
    var hit = answer(q);
    if (hit) { say(hit.a, 'bot', hit.link); return; }
    say('Det vet jag inte säkert – men vi svarar gärna själva. Skriv din e-postadress så mejlar vi dig ett svar.', 'bot');
    waitingForEmail = q;
  }
  toggle.addEventListener('click', function () { open(panel.hidden); });
  root.querySelector('.chat__close').addEventListener('click', function () { open(false); toggle.focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { open(false); toggle.focus(); } });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });
})();
