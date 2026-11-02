/* Price calculator on Priser: the website plans (fixed prices from the page) plus domain and mail from
   assets/data/catalog.json. The choice can be sent as a quote request with everything filled in. */
(function () {
  var form = document.getElementById('calc'); if (!form) return;
  var PLANS = { starter: { name: 'Hemsida Starter', once: 5000, year: '99–199' }, pro: { name: 'Hemsida Pro', once: 9000, year: '299–399' } };
  var kr = function (n) { return Math.round(n).toLocaleString('sv-SE') + ' kr'; };
  fetch('assets/data/catalog.json').then(function (r) { return r.json(); }).then(function (cat) {
    var se = cat.tlds.filter(function (t) { return t.tld === 'se'; })[0], mail = function (id) { return cat.mail.filter(function (m) { return m.id === id; })[0]; };
    form.querySelector('[data-price="domain"]').textContent = kr(se.register) + '/år';
    ['mejl-bas', 'mejl-foretag'].forEach(function (id) { form.querySelector('[data-price="' + id + '"]').textContent = kr(mail(id).monthly) + '/mån'; });
    function update() {
      var plan = PLANS[form.plan.value], m = form.mail.value ? mail(form.mail.value) : null, rows = [], once = 0, year = 0, month = 0, yearText = '';
      if (plan) { rows.push([plan.name, kr(plan.once) + ' + ' + plan.year + ' kr/år']); once += plan.once; yearText = plan.year + ' kr'; }
      if (form.domain.checked) { rows.push(['Domän (.se)', kr(se.register) + '/år']); year += se.register; }
      if (m) { rows.push([m.name, kr(m.monthly) + '/mån']); month += m.monthly; }
      document.getElementById('calc-rows').innerHTML = rows.length ? rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') : '<p>Välj något till vänster.</p>';
      document.getElementById('calc-once').textContent = kr(once);
      document.getElementById('calc-year').textContent = (year ? kr(year) : '') + (year && yearText ? ' + ' : '') + (yearText || (year ? '' : '0 kr'));
      document.getElementById('calc-month').textContent = kr(month);
      var text = 'Hej! Vi har räknat på ett paket i priskalkylatorn:\n\n' + rows.map(function (r) { return '- ' + r[0] + ': ' + r[1]; }).join('\n') + '\n\nEngångskostnad: ' + kr(once) + '\nPer år: ' + document.getElementById('calc-year').textContent + '\nPer månad: ' + kr(month) + '\n\n(Alla priser exkl. moms)';
      try { sessionStorage.setItem('es.calc', JSON.stringify({ title: 'Offertförfrågan: ' + rows.map(function (r) { return r[0]; }).join(' + '), text: text })); } catch (e) { /* the form still opens */ }
    }
    form.addEventListener('change', update); update();
  });
})();
