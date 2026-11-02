// How-to film: the customer portal, recorded on the demo data.
const { tour } = require('./tour.cjs');
tour('guide-kundportalen', async (t) => {
  await t.goto('http://localhost:8767/portal.html?demo');
  await t.card(t.LOGO + '<h1>Så använder ni <span class="hl">kundportalen</span></h1><p>Allt om er hemsida, domän, mejl och fakturor – på ett ställe.</p><ol><li>Översikt</li><li>Hemsidans admin</li><li>Besökare</li><li>Ändringar</li><li>Fakturor och ärenden</li><li>Team</li></ol>', 3600);
  await t.p.waitForSelector('.pa-nav');
  await t.uncard();
  await t.say('1', 'Översikten visar månadens besökare, förfrågningar och drifttid.');
  await t.ring('.pa-hero', 6); await t.sleep(1800); await t.ring('.pa-kpis', 6); await t.sleep(1500); await t.unring();
  await t.say('1', 'Under Att göra ser ni allt som väntar på er – till exempel ett pris att godkänna.');
  await t.ring('.pa-todo', 8); await t.move('.pa-todo li >> nth=0'); await t.sleep(1800); await t.unring();
  await t.say('2', 'Koppla er hemsidas admin: kopiera koden i er admin och klistra in den här.');
  await t.click('.pa-nav [data-tab=hemsida]'); await t.p.waitForSelector('#sx-form'); await t.sleep(600);
  await t.ring('.sx', 6); await t.sleep(2600); await t.unring();
  await t.click('#sx-demo'); await t.sleep(300); await t.click('#sx-form button.btn'); await t.p.waitForSelector('.sx__leads'); await t.sleep(700);
  await t.say('2', 'Nu ser ni förfrågningarna från hemsidan och kan öppna adminpanelen direkt.');
  await t.ring('.sx__leads', 6); await t.sleep(2000); await t.unring(); await t.move('.sx__acts .btn'); await t.sleep(1000);
  await t.say('3', 'Besökare: hur många som kommer, varifrån och vilka sidor de läser.');
  await t.click('.pa-nav [data-tab=besokare]'); await t.sleep(900);
  await t.click('[data-r="7"]'); await t.sleep(900); await t.click('[data-r="90"]'); await t.sleep(900);
  await t.p.mouse.wheel(0, 420); await t.sleep(1600); await t.p.mouse.wheel(0, -420); await t.sleep(400);
  await t.say('4', 'Vill ni ändra något? Beskriv det under Ändringar – vi återkommer med ett pris.');
  await t.click('.pa-nav [data-tab=andringar]'); await t.p.waitForSelector('#cr'); await t.sleep(400);
  await t.type('#cr input[name=page]', 'Startsidan', 40);
  await t.type('#cr textarea', 'Byt bilden högst upp mot en bild från vårt senaste projekt.', 25);
  await t.click('#cr button.btn'); await t.sleep(1000);
  await t.say('4', 'När priset är klart godkänner ni det med ett klick. Sedan sätter vi igång.');
  if (await t.p.locator('[data-ok]').count()) { await t.ring('.portal-change--quoted', 6); await t.sleep(1200); await t.click('[data-ok] >> nth=0'); await t.sleep(1200); await t.unring(); }
  await t.say('5', 'Fakturor: se vad som är betalt och vad som förfaller.');
  await t.click('.pa-nav [data-tab=fakturor]'); await t.sleep(2000);
  await t.say('5', 'Behöver ni hjälp? Skapa ett ärende så svarar vi här.');
  await t.click('.pa-nav [data-tab=support]'); await t.sleep(2200);
  await t.say('6', 'Under Konto och team bjuder ni in kollegor och väljer vad de får se.');
  await t.click('.pa-nav [data-tab=konto]'); await t.sleep(2400);
  await t.hush(); await t.out();
  await t.card(t.LOGO + '<h1>Allt på <span class="hl">ett</span> ställe.</h1><p>Logga in på elevatestudio.nu/portal</p>', 3000);
});
