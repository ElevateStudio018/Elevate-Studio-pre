"""Page content for elevatestudio.nu. The example projects under Projekt are fictional and marked as such."""

# Google PageSpeed Insights API key for the "Testa din sajt" tool.
# Free to create in Google Cloud Console (APIs & Services → enable "PageSpeed Insights API" → Credentials → API key).
# Restrict the key to your domain (HTTP referrers). Without a key the shared public quota is often exhausted.
PSI_API_KEY = ""

# The live address of the site, used for canonical links, sitemap and structured data.
SITE_URL = "https://elevatestudio.nu"

# Every form posts here. FormSubmit forwards the message to info@elevatestudio.nu.
# The first message triggers a one-time activation mail to info@elevatestudio.nu that must be confirmed.
FORM_ENDPOINT = "https://formsubmit.co/ajax/info@elevatestudio.nu"

# Admin at /admin runs in the browser and talks straight to the database (Supabase). The key below is
# the public "publishable" key – safe to ship; the database only lets accounts with the admin role read leads.
SUPABASE_URL = "https://halecxdjclrklyufbept.supabase.co"
SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGVjeGRqY2xya2x5dWZiZXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODYwOTcsImV4cCI6MjA5ODY2MjA5N30.Svt4abfAirAVLNDQkmSaQWep_0Ggz-h4WfOGdb0A4RQ"

# All mail to customers goes out from info@elevatestudio.nu through the "mail" function
# (supabase/functions/mail, sends with Brevo). Set MAIL_LIVE = True once it is deployed.
# Until then: leads are saved straight in the database, the team is notified at info@ via
# FormSubmit, and the admin opens review mails in your own mail program.
MAIL_FUNCTION = f"{SUPABASE_URL}/functions/v1/mail"
MAIL_LIVE = False

SERVICES = [
    {
        "slug": "hemsidor", "faq": [('Vad kostar en hemsida hos er?', 'Starter kostar 3 000 kr och Pro 6 000 kr i startavgift, plus en låg årsavgift. Större projekt får ett fast pris i en offert.'), ('Hur lång tid tar det att bygga en hemsida?', 'Ni ser ett första utkast av hemsidan redan efter ungefär en dag. Sedan finjusterar vi tillsammans tills ni är nöjda. Hur snabbt den går live beror mest på när vi har fått texter, bilder och åtkomst.'), ('Kan ni göra om vår gamla hemsida?', 'Ja. Vi kan bygga en ny sida från grunden och flytta över det innehåll som fungerar från den gamla.')],
        "seo_title": "Hemsidor för företag i Uppsala – webbdesign till fast pris", "h1": "Hemsidor för <em>företag</em>", "description": "Vi bygger snabba, mobilanpassade hemsidor för företag i alla storlekar – med fast pris från 3 000 kr. Webbyrå i Uppsala, kunder i hela Sverige.",
        "name": "Hemsidor", "short": "Hemsidor",
        "card": "Snabba, mobilanpassade hemsidor byggda för att ge förfrågningar.",
        "lead": "Snabba, mobilanpassade hemsidor som visar vad ni gör och gör det enkelt för kunderna att höra av sig.",
        "intro": "En hemsida ska inte bara se bra ut – den ska ge er nya kunder. Vi bygger sidor med tydliga tjänstesidor, en väg till kontakt på varje sida och en struktur som Google förstår. Ni får ett fast pris innan vi börjar och ser ett första utkast redan efter ungefär en dag.",
        "includes": [
            ("Design efter er verksamhet", "En design som passar ert företag och era kunder – inte en mall som ser ut som alla andras."),
            ("Mobilanpassning", "De flesta besökare kommer från telefonen. Sidan fungerar lika bra på mobil som på dator."),
            ("Tjänstesidor", "En egen sida för varje tjänst gör det lättare för både kunder och Google att hitta rätt."),
            ("Kontakt på varje sida", "Telefon, mejl och formulär är alltid ett klick bort."),
        ],
        "image": "home/svc-hemsidor.jpg", "alt": "Skisser och laptop på ett skrivbord under arbetet med en hemsida",
    },
    {
        "slug": "ai-chatt", "faq": [('Vad svarar AI-chatten på?', 'Chatten svarar på vanliga frågor utifrån informationen om ert företag – till exempel tjänster, priser, villkor och hur man bokar.'), ('Vad händer om chatten inte kan svara?', 'Då skickas frågan vidare till er via e-post eller SMS, så att ni kan svara kunden själva.'), ('Ingår AI-chatt i paketen?', 'AI-chatt ingår i Pro och Elite.')],
        "seo_title": "AI-chatt för hemsidan – svarar kunderna dygnet runt", "h1": "AI-chatt för <em>er hemsida</em>", "description": "En AI-chatt på hemsidan som svarar på kundernas vanliga frågor dygnet runt och skickar vidare förfrågningar till er via e-post eller SMS.",
        "name": "AI-chatt", "short": "AI-chatt",
        "card": "En chatt som svarar på vanliga frågor – även när ni inte hinner.",
        "lead": "En AI-chatt på hemsidan som svarar på kundernas vanliga frågor, dygnet runt.",
        "intro": "Många kunder har samma frågor: vad kostar det, när kan ni komma, gör ni det här? En AI-chatt svarar direkt utifrån informationen om ert företag, så att ni slipper svara på samma sak om och om igen – och kunden får svar medan intresset finns.",
        "includes": [
            ("Svarar dygnet runt", "Kunderna får svar direkt, även på kvällar och helger."),
            ("Bygger på er information", "Chatten utgår från era tjänster, priser och villkor."),
            ("Lämnar över till er", "När kunden vill gå vidare skickas förfrågan till er via e-post eller SMS."),
            ("Testad före lansering", "Vi testar chatten med riktiga frågor innan den går live."),
        ],
        "image": "home/svc-ai-chatt.jpg", "alt": "Händer som skriver på en laptop",
    },
    {
        "slug": "bokningssystem", "faq": [('Kan kunderna boka utan att ringa?', 'Ja. Kunden väljer en ledig tid direkt på hemsidan och ni får en notis via e-post eller SMS.'), ('Ingår bokning i paketen?', 'Bokning eller offertflöde ingår i Pro och Elite.')],
        "seo_title": "Bokningssystem för hemsidan – låt kunderna boka online", "h1": "Bokningssystem för <em>hemsidan</em>", "description": "Låt kunderna boka tid direkt på er hemsida. Bokningssystem med notiser via e-post och SMS – från Elevate Studio i Uppsala.",
        "name": "Bokningssystem", "short": "Bokning",
        "card": "Låt kunderna boka tid direkt på hemsidan – dygnet runt.",
        "lead": "Ett bokningssystem på hemsidan där kunderna själva väljer en tid som passar – med notiser till er via e-post och SMS.",
        "intro": "Varje gång en kund måste ringa eller mejla fram och tillbaka för att hitta en tid finns en risk att de ger upp. Med bokning direkt på sidan kan kunden boka på en gång, även när ni inte svarar i telefon.",
        "includes": [
            ("Bokning dygnet runt", "Kunden väljer en ledig tid direkt på sidan, när det passar dem."),
            ("Notiser via e-post och SMS", "Ni får besked direkt när en ny bokning kommer in."),
            ("Bekräftelse till kunden", "Kunden får en bekräftelse så att ingen missar tiden."),
            ("Status och historik", "Håll koll på alla bokningar på ett ställe."),
        ],
        "image": "home/svc-bokning.jpg", "alt": "Person som arbetar vid ett skrivbord med laptop",
    },
    {
        "slug": "offertsystem", "faq": [('Vad är ett offertsystem på hemsidan?', 'Ett formulär där kunden beskriver jobbet steg för steg, så att ni får alla uppgifter ni behöver för att kunna lämna ett pris.'), ('Vilka passar offertsystemet för?', 'Alla företag som behöver veta mer om jobbet innan de kan ge ett pris – till exempel byggföretag, konsulter, byråer och industriföretag.')],
        "seo_title": "Offertsystem och offertformulär för hemsidan", "h1": "Offertsystem för <em>hemsidan</em>", "description": "Ett offertformulär där kunden beskriver jobbet steg för steg, så att ni får kompletta förfrågningar. Perfekt för hantverkare och tjänsteföretag.",
        "name": "Offertsystem", "short": "Offert",
        "card": "Kunden beskriver jobbet steg för steg – ni får en komplett förfrågan.",
        "lead": "Ett offertflöde på hemsidan där kunden beskriver jobbet steg för steg, så att ni får allt ni behöver för att svara direkt.",
        "intro": "En vag förfrågan betyder ofta flera mejl fram och tillbaka innan ni kan räkna på jobbet. Med ett offertflöde får kunden svara på rätt frågor från början – och ni får en komplett förfrågan som går att svara på samma dag.",
        "includes": [
            ("Frågor steg för steg", "Kunden svarar på de frågor ni behöver för att kunna lämna ett pris."),
            ("Bilder och underlag", "Kunden kan bifoga bilder eller beskrivningar direkt i förfrågan."),
            ("Notiser via e-post och SMS", "Ni får besked direkt när en ny förfrågan kommer in."),
            ("Status och historik", "Se vilka förfrågningar som är besvarade och vilka som väntar."),
        ],
        "image": "home/svc-offert.jpg", "alt": "Kollegor som tittar på en laptop tillsammans",
    },
    {
        "slug": "seo-och-ai-optimering", "faq": [('Ingår SEO i hemsidan?', 'Ja. Grundläggande sökmotoroptimering och AI-optimering ingår i alla hemsidor vi bygger.'), ('Vad är AI-optimering?', 'Att bygga sidan så att AI-tjänster som ChatGPT kan förstå och beskriva ert företag rätt – med tydliga fakta, vanliga frågor och strukturerad data.')],
        "seo_title": "SEO i Uppsala och AI-optimering – syns på Google och i AI-sök", "h1": "SEO och <em>AI-optimering</em>", "description": "Sökmotoroptimering och AI-optimering så att kunderna hittar ert företag på Google och när de frågar ChatGPT och andra AI-tjänster.",
        "name": "SEO och AI-optimering", "short": "SEO",
        "card": "Syns på Google och när kunder frågar AI-assistenter.",
        "lead": "Sökmotoroptimering och AI-optimering så att kunderna hittar er – på Google och när de frågar en AI.",
        "intro": "Det spelar ingen roll hur bra hemsidan är om ingen hittar den. Vi bygger sidan så att Google och AI-tjänster förstår vad ni gör, var ni finns och vilka frågor ni kan svara på. Grundläggande SEO och AI-optimering ingår i alla hemsidor vi bygger.",
        "includes": [
            ("Teknisk grund", "Snabba sidor, rätt rubriker, beskrivningar och strukturerad data som sökmotorer läser."),
            ("Lokala sökningar", "Tydlig information om var ni finns och vilka orter ni jobbar i."),
            ("AI-optimering", "Innehåll och struktur som gör det lätt för AI-tjänster att beskriva er rätt."),
            ("Svar på vanliga frågor", "Svar på det kunderna faktiskt söker efter, direkt på sidan."),
        ],
        "image": "home/svc-seo.jpg", "alt": "Team med laptops runt ett bord, sett ovanifrån",
    },
    {
        "slug": "support-och-underhall", "faq": [('Vad ingår i supporten?', 'Under första året ingår upp till 10 timmars support och redigering per månad, till exempel text- och bildändringar, layoutjusteringar eller nya funktioner.'), ('Vad händer efter första året?', 'Den inkluderade timsupporten upphör och årsavgiften fortsätter. Fortsatt support och utveckling kan avtalas separat.')],
        "seo_title": "Support och underhåll av hemsida", "h1": "Support och <em>underhåll</em>", "description": "Ändringar, uppdateringar och uppföljning av er hemsida. Upp till 10 timmars support per månad ingår första året.",
        "name": "Support och underhåll", "short": "Support",
        "card": "Ändringar, uppdateringar och uppföljning – vi tar hand om det.",
        "lead": "Vi tar hand om ändringar, uppdateringar och uppföljning så att ni kan fokusera på ert jobb.",
        "intro": "En hemsida är aldrig helt färdig. Under första året ingår upp till 10 timmars support och redigering per månad – för text- och bildändringar, layoutjusteringar eller nya funktioner. Vi följer också upp vad som ger kunder och föreslår förbättringar.",
        "includes": [
            ("10 timmar i månaden", "Under första året ingår upp till 10 timmars support och redigering varje månad."),
            ("Ändringar", "Nya texter, bilder, priser eller tjänster – säg till så fixar vi det."),
            ("Uppföljning", "Vi tittar på vad som ger förfrågningar och justerar det som kan bli bättre."),
            ("Samma kontaktperson", "Ni pratar med samma person hela vägen, utan mellanhänder."),
        ],
        "image": "home/svc-support.jpg", "alt": "Person med laptop som arbetar med webbplatsens drift",
    },
]

CASES = [
    {
        # A real customer: the site is shown as it is, with no made-up story
        "slug": "alvhem-stad", "name": "Alvhem Städ", "tags": ["Städfirma", "Kund", "Webb"],
        "image": "home/alvhemstad-desktop.jpg", "w": 746, "h": 466, "phone_image": "home/alvhemstad-phone.jpg", "old_image": "home/alvhem-old.jpg", "video": "video/alvhem-hero.mp4", "overlay": "home/alvhem-overlay.webp",
        "site": "https://alvhemstad.se/", "site_label": "alvhemstad.se",
        "lead": "Städfirma i Älvängen utanför Göteborg med hemstädning, storstädning, flyttstädning och kontorsstädning till fasta priser.",
        "about": "Alvhem Städ AB hjälper privatpersoner och företag med regelbunden hemstädning, storstädning, flyttstädning och kontorsstädning. Fasta priser, RUT-avdrag direkt på fakturan, nöjd kund-garanti och samma städare vid varje tillfälle.",
        "features": ["Film i toppen som visar jobbet", "Egen sida för varje städtjänst, med priser", "Priskalkyl som räknar av RUT-avdraget direkt", "Boka uppstartsmöte från varje sida", "Anpassad för mobilen"],
    },
    {
        "slug": "fjallvagen-bildelar", "name": "Fjällvägen Bildelar", "tags": ["E-handel", "Sök", "Webb"],
        "image": "home/case-1.jpg", "w": 746, "h": 480,
        "lead": "En ny e-handel för reservdelar där kunderna hittar rätt del på några klick, oavsett bilmodell.",
        "challenge": "Kunderna hade svårt att veta vilka delar som passade deras bil. Många ringde kundtjänst innan de vågade beställa, och andelen returer var hög.",
        "solution": "Vi byggde en sökning där kunden anger registreringsnummer och direkt får se delar som passar. Kassan förenklades till ett steg och produktsidorna fick tydligare bilder och monteringsinformation.",
        "result": "Färre samtal till kundtjänst, färre returer och en kassa som fler slutför.",
    },
    {
        "slug": "bergsalen", "name": "Bergsalen", "tags": ["Sök", "Webb"],
        "image": "home/case-2.jpg", "w": 534, "h": 342,
        "lead": "En kulturhistorisk förening som ville göra sitt arkiv tillgängligt för fler.",
        "challenge": "Föreningens samlingar fanns digitaliserade men var gömda bakom en föråldrad sökfunktion som bara forskare orkade använda.",
        "solution": "Vi tog fram en ny struktur där samlingarna går att utforska via teman, platser och tidsperioder, med en sökning som förstår stavfel och gamla ortnamn.",
        "result": "Besökarna stannar längre och arkivet används nu även av skolor och släktforskare.",
    },
    {
        "slug": "nattbryggan", "name": "Nattbryggan", "tags": ["App", "Webb"],
        "image": "home/case-3.svg", "w": 534, "h": 342,
        "lead": "En app och en webb som gör det enkelt och tryggt att söka stöd, när som helst på dygnet.",
        "challenge": "En ideell stödlinje behövde nå unga som inte ringer, men som gärna skriver. Tjänsten måste vara diskret, trygg och fungera på alla telefoner.",
        "solution": "Vi designade en chattbaserad tjänst med snabb utloggning, ingen sparad historik på enheten och ett lugnt, inkluderande bildspråk.",
        "result": "Fler tar kontakt via chatt, och volontärerna kan hjälpa fler samtidigt.",
    },
    {
        "slug": "ljusars-filmdagar", "name": "Ljusårs Filmdagar", "tags": ["Intranät", "Sök", "Webb"],
        "image": "home/case-4.jpg", "w": 746, "h": 480,
        "lead": "En filmfestival som behövde samla biljetter, program och nyheter på ett ställe.",
        "challenge": "Under festivalveckan ökar trafiken tiofalt. Den gamla sajten gick ner varje år när biljettsläppet startade.",
        "solution": "Vi byggde en statiskt genererad sajt med cachning i flera lager och ett separat, skalbart flöde för biljetter. Ett intranät hjälper personalen att hålla programmet uppdaterat.",
        "result": "Sajten klarade festivalens toppar utan avbrott och programmet uppdateras nu i realtid.",
    },
    {
        "slug": "hallmark-industri", "name": "Hallmark Industri", "tags": ["Intranät", "Webb"],
        "image": "home/case-5.jpg", "w": 746, "h": 480,
        "lead": "Intranät och publika sajter för medarbetare och kunder i många länder.",
        "challenge": "Ett internationellt industriföretag hade ett tiotal olika sajter och intranät som inte pratade med varandra.",
        "solution": "Vi samlade allt på en gemensam plattform med ett designsystem, delade komponenter och ett gemensamt flöde för översättningar.",
        "result": "Snabbare publicering, ett enhetligt varumärke och lägre förvaltningskostnad.",
    },
    {
        "slug": "insjons-insamlingsfond", "name": "Insjöns Insamlingsfond", "tags": ["Marknadsföring", "Webb"],
        "image": "home/case-6.jpg", "w": 534, "h": 342,
        "lead": "En insamlingsorganisation som ville få fler månadsgivare – med ett enklare givarflöde och tydliga resultat.",
        "challenge": "Givarna ville känna sig trygga med att pengarna gör nytta, och organisationen ville öka andelen månadsgivare.",
        "solution": "Vi förenklade givarflödet, lyfte fram konkreta resultat och byggde kampanjsidor som marknadsteamet kan skapa själva.",
        "result": "Fler månadsgivare och kampanjer som lanseras på dagar i stället för veckor.",
    },
]

ARTICLES = [
    {
        "slug": "bygga-hemsida-sjalv-eller-webbyra", "title": "Bygga hemsida själv eller anlita en webbyrå?",
        "terms": ['Hemsidor', 'Guide'], "date": "28 oktober 2026", "image": "home/about-2.jpg",
        "body": [
            ("p", "Det har aldrig varit enklare att skapa en hemsida själv. Med verktyg som Wix, Squarespace och WordPress kan vem som helst få upp en sida på en kväll. Frågan är snarare vad hemsidan ska göra för ditt företag – och vad din tid är värd."),
            ("h2", "När det räcker att bygga hemsidan själv"),
            ("ul", ["Du behöver bara ett enkelt visitkort på nätet med kontaktuppgifter.", "Du har tid och tycker att det är roligt att lära dig verktyget.", "Det är inte så viktigt att synas högt på Google."]),
            ("h2", "När en webbyrå lönar sig"),
            ("ul", ["Hemsidan ska ge förfrågningar, inte bara finnas.", "Du vill synas när kunder söker på din tjänst på din ort.", "Du behöver bokning, offertformulär eller en chatt som svarar kunderna.", "Du vill slippa tekniken och lägga tiden på ditt eget jobb."]),
            ("h2", "Det många glömmer när de skapar hemsidan själva"),
            ("ul", ["Tiden: att bygga, skriva texter och hålla sidan uppdaterad tar ofta mycket längre tid än man tror.", "Löpande kostnader: byggverktygen tar ofta en månadsavgift så länge sidan finns.", "Synligheten: en snygg mall syns inte automatiskt på Google – det kräver tydliga tjänstesidor, rätt rubriker och snabba sidor."]),
            ("h2", "Så gör vi"),
            ("p", "Som webbyrå i Uppsala bygger vi hemsidor till fast pris: Starter kostar 3 000 kr i startavgift och därefter 99–199 kr per år. Du ser ett första utkast efter ungefär en dag, domänen är alltid din och under första året ingår upp till 10 timmars support och ändringar per månad."),
        ],
    },
    {
        "slug": "vad-kostar-en-hemsida", "title": "Vad kostar en hemsida – och vad betalar du egentligen för?",
        "terms": ['Priser', 'Guide'], "date": "27 oktober 2026", "image": "home/post-3.jpg",
        "body": [
            ("p", "Frågan om vad en hemsida kostar får svar som spretar från några hundralappar till hundratusentals kronor. Skillnaden ligger sällan i själva sidan, utan i vad som ingår – och i vad som tillkommer efteråt."),
            ("h2", "Det här brukar priset bestå av"),
            ("ul", ["En startkostnad för design och bygge av sidan.", "En löpande kostnad för domän, drift och hosting.", "Support och ändringar efter lansering – ingår de, eller betalar du per timme?", "Funktioner som bokning, offertformulär eller chatt, som ofta prissätts separat."]),
            ("h2", "Fem frågor att ställa innan du väljer leverantör"),
            ("ul", ["Är priset fast, eller kan det bli dyrare under arbetets gång?", "Vem äger domänen – du eller leverantören?", "Vad ingår i supporten, och hur länge?", "Vad kostar det efter första året?", "Finns det någon bindningstid?"]),
            ("h2", "Så gör vi"),
            ("p", "Hos oss får du ett fast pris i en offert innan vi börjar. Starter kostar 3 000 kr i startavgift och därefter 99–199 kr per år, och under första året ingår upp till 10 timmars support och ändringar per månad. Domänen är alltid din. På vår prissida ser du vad som ingår i varje paket, och du kan ladda ner ett exempel på hur vårt avtal ser ut."),
        ],
    },
    {
        "slug": "fa-besokare-att-hora-av-sig", "title": "Fem saker som får besökare att höra av sig",
        "terms": ['Hemsidor', 'Guide'], "date": "20 oktober 2026", "image": "home/post-2.jpg",
        "body": [
            ("p", "En hemsida kan vara snygg och ändå inte ge en enda förfrågan. Oftast beror det inte på designen, utan på att besökaren inte förstår vad ni gör, inte litar på er eller inte hittar hur man tar kontakt. Här är fem saker som gör störst skillnad."),
            ("h2", "1. Säg vad ni gör – direkt"),
            ("p", "Den första rubriken ska berätta vad ni erbjuder och var. ”Badrumsrenoveringar i Uppsala” fungerar bättre än ”Kvalitet i varje detalj”, både för besökaren och för Google."),
            ("h2", "2. Gör det lätt att ta kontakt"),
            ("p", "Telefonnummer och en knapp för att höra av sig ska synas på varje sida, inte bara på kontaktsidan. Ju färre klick, desto fler förfrågningar."),
            ("h2", "3. En sida per tjänst"),
            ("p", "En egen sida för varje tjänst gör det enklare för besökaren att hitta rätt – och för Google att visa er när någon söker på just den tjänsten."),
            ("h2", "4. Visa att ni är på riktigt"),
            ("p", "Bilder på riktiga jobb, recensioner från kunder och namnen på dem som jobbar hos er bygger förtroende snabbare än allmänna löften."),
            ("h2", "5. Snabb på mobilen"),
            ("p", "De flesta besökare kommer från telefonen. En sida som laddar långsamt eller är svår att använda på liten skärm tappar dem innan de ens läst rubriken. Du kan testa din egen sida gratis med vårt djuptest."),
        ],
    },
    {
        "slug": "synas-nar-kunder-fragar-ai", "title": "Så syns ditt företag när kunder frågar AI",
        "terms": ['AI', 'SEO'], "date": "13 oktober 2026", "image": "home/post-1.jpg",
        "body": [
            ("p", "Allt fler söker inte längre bara på Google, utan ställer frågan direkt till en AI-assistent: ”Vilken snickare i Haninge kan bygga om mitt kök?” Svaret bygger på det som finns att läsa om ditt företag på nätet – och då behöver din hemsida säga rätt saker, på rätt sätt."),
            ("h2", "Från placering till omnämnande"),
            ("p", "I vanlig sökning handlar det om att hamna högt i en lista. I ett AI-svar finns ingen lista – antingen nämns ditt företag, eller så gör det inte det. Och när det nämns måste informationen stämma."),
            ("h2", "Tre saker att börja med"),
            ("ul", ["Beskriv tydligt vad ni gör, för vem och var – med samma ord på alla sidor.", "Svara på de frågor kunderna faktiskt ställer, till exempel i en sektion med vanliga frågor.", "Håll kontaktuppgifter, öppettider och tjänster uppdaterade, både på sajten och i Googles företagsprofil."]),
            ("p", "Det mesta som gör dig synlig för AI gör dig också bättre på Google. Därför ingår både sökmotoroptimering (SEO) och AI-optimering i alla hemsidor vi bygger."),
        ],
    },
    {
        "slug": "fore-och-efter-alvhem-stad", "title": "Före och efter: Alvhem Städs nya hemsida",
        "terms": ['Kund', 'Hemsidor'], "date": "6 oktober 2026", "image": "home/alvhemstad-desktop.jpg",
        "body": [
            ("p", "Alvhem Städ i Älvängen hade en hemsida som fanns, men som inte gjorde något. Vi byggde en ny från grunden. Här är vad som ändrades och varför."),
            ("h2", "Det som var problemet"),
            ("p", "Tjänsterna låg samlade på en sida, priserna saknades och enda sättet att komma i kontakt var ett formulär längst ner. Den som sökte på ”flyttstädning Älvängen” hittade ingen sida om just det."),
            ("h2", "Det vi gjorde"),
            ("ul", ["Film i toppen som visar jobbet.", "En egen sida för varje städtjänst, med pris.", "En priskalkyl som räknar av RUT-avdraget direkt.", "Bokning av uppstartsmöte från varje sida.", "Allt anpassat för mobilen först."]),
            ("h2", "Se det själv"),
            ("p", "På <a href=\"projekt/alvhem-stad.html\">projektsidan</a> kan ni dra i ett reglage och jämföra den gamla sidan med den nya. Fler sajter vi byggt finns under <a href=\"byggda-hemsidor.html\">Hemsidor vi byggt</a>."),
        ],
    },
    {
        "slug": "vad-hander-efter-lansering", "title": "Vad händer med hemsidan efter lansering?",
        "terms": ['Support', 'Guide'], "date": "29 september 2026", "image": "home/svc-support.jpg",
        "body": [
            ("p", "Många hemsidor är som bäst dagen de lanseras och sedan händer ingenting på tre år. Priserna är gamla, personalen har bytts ut och den senaste nyheten är från lanseringen. Så här håller ni sidan levande utan att det tar tid."),
            ("h2", "En gång i månaden, tio minuter"),
            ("ul", ["Lägg upp ett nytt jobb med en bild.", "Kolla att priser och öppettider stämmer.", "Läs recensionerna på Google och svara."]),
            ("h2", "En gång om året"),
            ("ul", ["Byt ut bilder som börjat kännas gamla.", "Testa hastigheten och att allt fungerar i mobilen.", "Läs igenom texterna: stämmer det fortfarande med vad ni gör?"]),
            ("h2", "Det ni inte ska behöva tänka på"),
            ("p", "Säkerhetsuppdateringar, certifikat, säkerhetskopior och att servern är uppe. Det ska någon annan sköta. En sida byggd utan tunga tillägg har dessutom väldigt lite som kan gå sönder."),
            ("h2", "Så funkar det hos oss"),
            ("p", "Drift och en låg årsavgift ingår, och ändringar gör vi åt er. Läs mer om <a href=\"tjanster/support-och-underhall.html\">support och underhåll</a> och vad som ingår i <a href=\"priser.html\">priserna</a>."),
        ],
    },
    {
        "slug": "darfor-ar-en-snabb-hemsida-viktigare-an-en-snygg", "title": "Snabb hemsida slår snygg hemsida",
        "terms": ['Hemsidor', 'SEO'], "date": "15 september 2026", "image": "home/process-5.jpg",
        "body": [
            ("p", "En hemsida som laddar långsamt tappar besökare innan de sett en enda bild, hur vacker den än är. Hastighet är dessutom en av de saker Google väger in när resultaten rankas. Här är vad som brukar göra sidor långsamma, och vad som går att göra."),
            ("h2", "De vanligaste bovarna"),
            ("ul", ["Bilder rakt från mobilkameran, flera megabyte styck, som visas i frimärksstorlek.", "Tillägg och skript som laddas på varje sida men bara används på en.", "Typsnitt och bibliotek som hämtas från flera olika ställen.", "Ett webbhotell som delas med hundratals andra sajter."]),
            ("h2", "Vad som går att göra"),
            ("p", "Bilder ska skalas ner till den storlek de visas i och sparas i ett modernt format. Skript som inte behövs ska bort. Sidan ska ligga på en server nära besökarna. Mycket av det här går att fixa på en befintlig sida, resten kräver att sidan byggs om."),
            ("h2", "Mät innan ni gissar"),
            ("p", "Kör sidan genom <a href=\"testa.html\">Testa din sajt</a>. Ni får ett betyg för prestanda och en lista på vad som drar ner det. Betyget för mobilen är det som räknas."),
            ("h2", "Så bygger vi"),
            ("p", "De hemsidor vi bygger är statiska sidor utan tunga tillägg, med bilder i rätt storlek och snabb leverans över hela världen. Det är en av anledningarna till att vi kan hålla <a href=\"priser.html\">fasta priser</a>: det finns inget som går sönder och behöver lappas."),
        ],
    },
    {
        "slug": "hemsida-for-byggfirma", "title": "Hemsida för byggfirma: rätt sorts jobb",
        "terms": ['Hemsidor', 'Branscher'], "date": "25 augusti 2026", "image": "home/post-3.jpg",
        "body": [
            ("p", "En byggfirma lever på förtroende och på att få rätt förfrågningar: tillräckligt stora jobb, i rätt område, från kunder som är redo att börja. Hemsidan ska sortera fram dem."),
            ("h2", "Visa jobben, inte verktygen"),
            ("p", "Ett galleri med färdiga projekt, gärna filtrerat på kök, badrum, totalrenovering och utomhus, är det som säljer. Före och efter från samma vinkel. Ort och ungefärlig tid för varje projekt."),
            ("h2", "Berätta hur det går till"),
            ("ul", ["Kontakt: kunden berättar om projektet.", "Kostnadsfritt hembesök: ni tittar på plats.", "Fast offert innan arbetet börjar.", "Genomgång när jobbet är klart."]),
            ("h2", "Offert på varje sida"),
            ("p", "Knappen ”Få gratis offert” ska finnas i toppen, i varje tjänstesektion och längst ner. Den som bestämt sig ska aldrig behöva leta."),
            ("h2", "Ett riktigt exempel"),
            ("p", "<a href=\"byggda-hemsidor.html\">Haninge Byggteam AB</a> i Stockholm fick en hemsida byggd runt just det: offertknapp i varje del av sidan, ett projektgalleri med filter, ”Så arbetar vi” i fyra steg och deras 5,0 i Google-betyg redan i toppen."),
        ],
    },
    {
        "slug": "offertflode-ratt-forfragningar", "title": "Offertflöde: få in rätt förfrågningar, inte bara fler",
        "terms": ['Offert', 'Guide'], "date": "11 augusti 2026", "image": "home/svc-offert.jpg",
        "body": [
            ("p", "Fler förfrågningar låter bra tills hälften av dem gäller jobb ni inte gör, i områden ni inte åker till. Ett bra offertformulär sorterar innan ni lyfter luren, och ger er det underlag ni behöver för att svara snabbt."),
            ("h2", "Fråga om det som avgör"),
            ("ul", ["Vilken tjänst det gäller, som ett val i en lista, inte fritext.", "Var jobbet ska göras, så ni direkt ser om det är inom ert område.", "När kunden vill ha det gjort.", "Gärna en bild. Ett foto på badrummet säger mer än tre stycken text."]),
            ("h2", "Men inte mer än så"),
            ("p", "Varje extra fält gör att färre skickar. Namn, telefon, tjänst, ort och ett fritextfält räcker nästan alltid. Resten tar ni i samtalet."),
            ("h2", "Svara innan konkurrenten"),
            ("p", "Den som frågar tre firmor väljer ofta den som svarar först. Ett automatiskt svar direkt, ”Tack, vi ringer dig i dag eller i morgon”, köper er tid. Sedan ska förfrågan ligga någonstans där ni ser den: inte bara i en inkorg som fylls på med annat."),
            ("p", "Vårt <a href=\"tjanster/offertsystem.html\">offertsystem</a> ger er en lista med alla förfrågningar, status på varje, och en offert som PDF när ni är redo att skicka den."),
        ],
    },
    {
        "slug": "hemsida-for-stadfirma", "title": "Hemsida för städfirma: det som ska finnas",
        "terms": ['Hemsidor', 'Branscher'], "date": "28 juli 2026", "image": "home/svc-hemsidor.jpg",
        "body": [
            ("p", "Den som letar städfirma vill veta tre saker: vad det kostar, om RUT-avdraget dras direkt och hur man kommer igång. En hemsida för en städfirma ska svara på det innan besökaren hunnit scrolla."),
            ("h2", "En sida per tjänst"),
            ("p", "Hemstädning, storstädning, flyttstädning och kontorsstädning är fyra olika sökningar. Varje tjänst behöver en egen sida med pris, vad som ingår och en knapp för att boka. Då hittar Google rätt sida för rätt sökning."),
            ("h2", "Priset, med RUT"),
            ("p", "Skriv timpriset efter RUT-avdrag, och vad det blir för en vanlig lägenhet. En kalkyl där kunden fyller i kvadratmeter och ser priset direkt tar bort det vanligaste skälet att inte höra av sig."),
            ("h2", "Förtroende"),
            ("ul", ["Samma städare varje gång, om ni erbjuder det.", "Försäkring och nöjd kund-garanti, i klartext.", "Recensioner från Google, och riktiga bilder på teamet."]),
            ("h2", "Ett riktigt exempel"),
            ("p", "Så byggde vi hemsidan för <a href=\"projekt/alvhem-stad.html\">Alvhem Städ</a> i Älvängen: film i toppen, en sida per städtjänst med pris, en kalkyl som räknar av RUT direkt och bokning av uppstartsmöte från varje sida."),
        ],
    },
    {
        "slug": "skriv-texter-som-kunder-faktiskt-laser", "title": "Texter som kunder faktiskt läser",
        "terms": ['Hemsidor', 'Guide'], "date": "14 juli 2026", "image": "home/post-2.jpg",
        "body": [
            ("p", "Den vanligaste texten på svenska företags hemsidor börjar med ”Vi är ett företag med lång erfarenhet och hög kvalitet”. Ingen kund har någonsin valt en firma på grund av den meningen. Så här skriver ni i stället."),
            ("h2", "Börja med kundens fråga"),
            ("p", "Besökaren har ett problem: ett badrum som ska renoveras, ett kontor som ska städas. Börja där. ”Ska ni renovera badrummet? Vi gör allt från rivning till kakel, i Uppsala med omnejd, till fast pris.” Nu vet kunden att hen är på rätt sida."),
            ("h2", "Korta meningar, konkreta ord"),
            ("ul", ["Skriv ”vi kommer inom två dagar” i stället för ”snabb service”.", "Skriv ”fast pris innan vi börjar” i stället för ”konkurrenskraftiga priser”.", "Skriv ”Anna svarar i telefon” i stället för ”personlig service”.", "En tanke per mening. Stryk varje ord som inte behövs."]),
            ("h2", "Rubriker som går att skumma"),
            ("p", "De flesta läser inte, de skummar. Rubrikerna ska därför berätta hela historien själva: Vad vi gör, Var vi jobbar, Vad det kostar, Så kommer ni igång. Den som bara läser rubrikerna ska ändå förstå vad ni erbjuder."),
            ("h2", "Avsluta med nästa steg"),
            ("p", "Varje sida ska sluta med en sak att göra: ring, boka, skicka en förfrågan. En knapp, inte tre. Vi skriver texterna till de hemsidor vi bygger tillsammans med kunden, utifrån hur de själva pratar om jobbet. Läs mer om <a href=\"tjanster/hemsidor.html\">hur vi bygger hemsidor</a>."),
        ],
    },
    {
        "slug": "vad-ska-sta-pa-kontaktsidan", "title": "Vad ska stå på kontaktsidan?",
        "terms": ['Hemsidor', 'Guide'], "date": "23 juni 2026", "image": "home/about-3.jpg",
        "body": [
            ("p", "Kontaktsidan är ofta den näst mest besökta sidan efter startsidan, och den som flest lämnar utan att göra något. Oftast för att den gör det svårt. Så här gör ni den enkel."),
            ("h2", "Tre sätt att höra av sig, synliga direkt"),
            ("ul", ["Telefonnummer som går att trycka på, med namnet på den som svarar.", "E-postadress på er egen domän.", "Ett kort formulär: namn, telefon, vad det gäller. Inget mer."]),
            ("h2", "Säg när ni svarar"),
            ("p", "”Vi svarar samma dag på vardagar” tar bort osäkerheten. Har ni telefontid, skriv ut den. Har ni inte det, skriv ”ring när som helst, vi ringer tillbaka om vi inte kan svara”."),
            ("h2", "Visa var ni finns"),
            ("p", "Ort och område ni jobbar i, gärna en karta om kunder besöker er. Och ett foto på den som svarar. Folk ringer hellre Anna än ”kundtjänst”."),
            ("h2", "Ta bort det som stör"),
            ("p", "Inga obligatoriska fält för organisationsnummer, inga captcha-pussel, inga tio val i en lista. Varje hinder kostar förfrågningar. Titta på vår egen <a href=\"kontakt.html\">kontaktsida</a>: ring, mejla eller skriv, tre knappar och ett formulär."),
        ],
    },
    {
        "slug": "sommarkoll-pa-hemsidan", "title": "Sommarkoll på hemsidan innan semestern",
        "terms": ['Hemsidor', 'Tips'], "date": "9 juni 2026", "image": "home/process-3.jpg",
        "body": [
            ("p", "Under semestern jobbar hemsidan åt er när ni inte gör det. Men bara om den säger rätt saker. Här är det som brukar behöva ändras innan ni stänger."),
            ("h2", "Skriv ut när ni är tillbaka"),
            ("p", "En rad högst upp på startsidan räcker: ”Vi har semester 13 juli till 3 augusti och svarar på alla förfrågningar när vi är tillbaka.” Den som skickar en förfrågan vet då varför det dröjer, och väljer inte bort er."),
            ("h2", "Låt formuläret svara åt er"),
            ("p", "Ett automatiskt svar på förfrågningar, med samma information och ett nummer för akuta ärenden om ni har ett, gör att kunden känner sig sedd. Har ni en <a href=\"tjanster/ai-chatt.html\">AI-chatt</a> svarar den på vanliga frågor även när ni ligger i hängmattan."),
            ("h2", "Passa på att samla in jobb för hösten"),
            ("ul", ["Lägg till en rad om att ni tar emot bokningar för augusti och september.", "Lyft de tjänster som säljer bäst på hösten.", "Lägg upp bilder på vårens jobb medan de är färska."]),
            ("h2", "Efter semestern"),
            ("p", "Ta bort semesterraden första dagen tillbaka. En hemsida som i september fortfarande säger att ni har semester ser ut som att ingen bryr sig om den."),
        ],
    },
    {
        "slug": "fa-fler-recensioner-pa-google", "title": "Så får ni fler recensioner på Google",
        "terms": ['SEO', 'Tips'], "date": "26 maj 2026", "image": "home/process-4.jpg",
        "body": [
            ("p", "Recensioner avgör ofta vem som får samtalet när kunden jämför tre firmor på kartan. De flesta nöjda kunder skriver ändå ingen, inte för att de inte vill, utan för att ingen bad dem. Så här ber ni."),
            ("h2", "Be direkt efter jobbet"),
            ("p", "Samma dag eller dagen efter, när kunden fortfarande är glad över resultatet. Ett kort mejl eller sms: ”Tack för förtroendet! Skulle du vilja skriva några rader om hur det gick? Det betyder mycket för oss.” Och en länk som går rakt till rutan där man skriver, inte till er profil i allmänhet."),
            ("h2", "Gör det lätt"),
            ("ul", ["En länk, ett klick. Ingen inloggning utöver det Google-konto de redan har.", "Föreslå vad de kan skriva om: vad som gjordes, hur kontakten var, om det blev som de tänkt.", "Be inte alla samma vecka. Google tycker bättre om en jämn ström än en klump."]),
            ("h2", "Svara på varje recension"),
            ("p", "Ett ”Tack Anna, kul att altanen blev som ni ville!” visar nästa kund att ni bryr er. Får ni en dålig recension, svara lugnt och sakligt och erbjud att lösa det. Den som läser bedömer svaret mer än klagomålet."),
            ("p", "I det <a href=\"tjanster/offertsystem.html\">offertsystem</a> vi bygger finns ett färdigt recensionsmejl som skickas med ett klick när jobbet är klart."),
        ],
    },
    {
        "slug": "mobilen-forst-sa-ser-kunderna-er-hemsida", "title": "Mobilen först: så ser kunderna faktiskt er hemsida",
        "terms": ['Hemsidor', 'Guide'], "date": "12 maj 2026", "image": "home/svc-hemsidor.jpg",
        "body": [
            ("p", "De flesta som besöker ett lokalt företags hemsida gör det från mobilen, ofta på väg någonstans. Ändå designas många sidor på en stor skärm och krymps sedan ner. Resultatet är små knappar, text som inte går att läsa och menyer som inte går att öppna."),
            ("h2", "Så testar ni på två minuter"),
            ("ul", ["Öppna hemsidan i mobilen utan att zooma. Går texten att läsa?", "Går det att trycka på telefonnumret och på knappen för att skicka en förfrågan med tummen?", "Syns vad ni gör och var ni finns innan man scrollar?", "Laddar sidan på mobilnät, inte bara på wifi?"]),
            ("h2", "Vad mobilen först betyder när vi bygger"),
            ("p", "Vi ritar mobilversionen först och låter datorversionen växa ur den. Det tvingar fram prioriteringar: det viktigaste högst upp, en sak per skärm, stora tryckytor. Datorversionen blir sedan en luftigare variant av samma sida, inte en annan sida."),
            ("h2", "Google mäter mobilversionen"),
            ("p", "Google bedömer er sida utifrån hur den fungerar i mobilen, inte på datorn. En sida som är långsam eller svårläst i mobilen hamnar längre ner i resultaten, hur bra den än ser ut på en stor skärm."),
            ("p", "På <a href=\"projekt/index.html\">projektsidan</a> kan ni se samma hemsida på dator och mobil, sida vid sida."),
        ],
    },
    {
        "slug": "egna-bilder-slar-bildbanker", "title": "Egna bilder slår bildbanker, varje gång",
        "terms": ['Hemsidor', 'Tips'], "date": "28 april 2026", "image": "home/about-1.jpg",
        "body": [
            ("p", "Den leende kvinnan med headset finns på tusen hemsidor. Besökaren känner igen henne och slutar lita på sidan. Ett suddigt foto på er riktiga bil utanför ett riktigt jobb säger mer än alla bildbanker i världen."),
            ("h2", "Bilder som fungerar"),
            ("ul", ["Ni själva, på jobbet, i arbetskläder.", "Före och efter på riktiga jobb, tagna från samma vinkel.", "Verkstaden, lagret, bilarna, verktygen.", "Kunder som godkänt att vara med, gärna med ett citat."]),
            ("h2", "Så tar ni dem med mobilen"),
            ("p", "Dagsljus, inte blixt. Håll telefonen stilla och ta tre bilder av varje motiv. Torka av linsen. Ta liggande bilder till datorn och stående till mobilen. Det räcker långt. En fotograf en halvdag om året är en bra investering för resten."),
            ("h2", "Storleken spelar roll"),
            ("p", "Bilder rakt från mobilen är för stora för webben och gör sidan långsam. Vi skalar ner och sparar alla bilder i rätt storlek när vi bygger, så att de laddar snabbt även på mobilnät. Se våra <a href=\"byggda-hemsidor.html\">byggda hemsidor</a> för exempel på sajter med kundernas egna bilder."),
        ],
    },
    {
        "slug": "bokningssystem-for-hantverkare", "title": "Bokningssystem för hantverkare: slipp telefonen i bilen",
        "terms": ['Bokning', 'Hantverkare'], "date": "14 april 2026", "image": "home/svc-bokning.jpg",
        "body": [
            ("p", "De flesta hantverkare får sina förfrågningar i telefon, mitt i ett jobb. Samtal missas, lappar försvinner och kunden ringer nästa firma. Ett bokningssystem på hemsidan låter kunden välja tid själv, dygnet runt, och ni ser allt samlat."),
            ("h2", "Vad som ska gå att boka"),
            ("ul", ["Ett kostnadsfritt hembesök eller platsbesök, i tider ni själva bestämmer.", "Ett kort telefonmöte för att gå igenom ett projekt.", "För vissa branscher själva jobbet: fönsterputs, städning, service."]),
            ("h2", "Det som gör att det funkar i praktiken"),
            ("ul", ["Kalendern visar bara tider ni faktiskt är lediga, kopplad till den kalender ni redan använder.", "Kunden får en bekräftelse direkt, med tid och adress, och en påminnelse dagen innan.", "Ni får ett mejl eller sms per bokning, med namn, telefonnummer och vad det gäller.", "Det går att boka från varje sida, inte bara kontaktsidan."]),
            ("h2", "Vad det innebär för kunden"),
            ("p", "Den som sitter med ett läckande tak klockan nio på kvällen vill inte vänta till morgonen. Kan hen boka ett besök direkt är chansen stor att ni får jobbet, oavsett vem som har bäst pris."),
            ("p", "Vi bygger <a href=\"tjanster/bokningssystem.html\">bokningssystem</a> som en del av hemsidan, till fast pris. Det kopplas till er kalender och fungerar i mobilen."),
        ],
    },
    {
        "slug": "ai-chatt-pa-hemsidan-vad-den-kan", "title": "AI-chatt på hemsidan: vad den kan, och vad den inte ska göra",
        "terms": ['AI', 'Guide'], "date": "24 mars 2026", "image": "home/svc-ai-chatt.jpg",
        "body": [
            ("p", "En chatt på hemsidan som svarar direkt låter bra, men en dåligt gjord chatt skrämmer bort fler än den hjälper. Här är vad en bra AI-chatt gör, och var gränsen går."),
            ("h2", "Det här ska den klara"),
            ("ul", ["Svara på frågor om era tjänster, områden, priser och tider, utifrån det som står på hemsidan.", "Ställa en följdfråga när det behövs: vilken typ av jobb, var, när.", "Lämna över: ta namn och telefonnummer och skicka till er, eller öppna bokningen.", "Säga att den inte vet, och hänvisa till telefon, i stället för att gissa."]),
            ("h2", "Det här ska den inte göra"),
            ("ul", ["Lova priser eller tider som inte står någonstans.", "Låtsas vara en människa.", "Tjata. Ett litet ”Frågor?” i hörnet räcker, inga popups."]),
            ("h2", "Så bygger vi den"),
            ("p", "Vår <a href=\"tjanster/ai-chatt.html\">AI-chatt</a> tränas på er hemsida och det ni berättar om jobbet. Den svarar på svenska, lämnar över till er när intresset är tillräckligt stort, och ni ser varje samtal i efterhand."),
        ],
    },
    {
        "slug": "vad-ar-ai-optimering", "title": "Vad är AI-optimering, och varför pratar alla om det?",
        "terms": ['AI', 'SEO'], "date": "10 mars 2026", "image": "home/svc-ai-chatt.jpg",
        "body": [
            ("p", "Allt fler frågar en AI-assistent i stället för att googla: ”Vilken elektriker i Uppsala kan komma den här veckan?” Svaret bygger på det som finns att läsa om företagen på nätet. AI-optimering, ibland kallat AIO, handlar om att göra ert företag lätt att förstå och återge för de här tjänsterna."),
            ("h2", "Vad AI-tjänsterna faktiskt läser"),
            ("ul", ["Text på hemsidan, i klartext. Inte text i bilder.", "Strukturerad data: en osynlig beskrivning av företaget som anger namn, ort, tjänster och telefonnummer på ett sätt maskiner förstår.", "Er Google-profil och recensionerna där.", "Vanliga frågor med raka svar."]),
            ("h2", "Så skriver ni för både människor och AI"),
            ("p", "Skriv som ni skulle svara i telefon. ”Vi bygger altaner i Uppsala och Knivsta, de flesta jobb tar en till två veckor, och vi ger alltid fast pris.” Den meningen kan en AI återge ordagrant. ”Vi levererar kundanpassade lösningar med hög kvalitet” kan den inte göra något av."),
            ("h2", "Det är samma jobb som vanlig SEO"),
            ("p", "Tydliga tjänstesidor, orten utskriven, snabb sida och en komplett Google-profil. Det som gör att Google hittar er gör att AI-tjänsterna gör det också. Skillnaden är att AI:n gärna vill ha fullständiga meningar och svar på frågor, inte bara nyckelord."),
            ("p", "Grundläggande SEO och AI-optimering ingår i alla hemsidor vi bygger. Läs mer om <a href=\"tjanster/seo-och-ai-optimering.html\">hur vi gör</a>."),
        ],
    },
    {
        "slug": "darfor-ska-hemsidan-ha-vanliga-fragor", "title": "Därför ska hemsidan ha en sida med vanliga frågor",
        "terms": ['SEO', 'Guide'], "date": "23 februari 2026", "image": "home/post-1.jpg",
        "body": [
            ("p", "De frågor ni får i telefon varje vecka är samma frågor folk skriver in på Google och ställer till AI-assistenter. Svarar hemsidan på dem sparar ni samtal, och ni syns där frågorna ställs."),
            ("h2", "Vilka frågor"),
            ("ul", ["Vad kostar det? Ge ett spann eller ett exempel, inte ”kontakta oss för offert”.", "Var jobbar ni? Skriv ut orterna.", "Hur lång tid tar det? Hur snabbt kan ni komma?", "Vad behöver kunden göra själv innan ni kommer?", "Har ni F-skatt, försäkring, garanti?"]),
            ("h2", "Så skriver ni svaren"),
            ("p", "Kort fråga som rubrik, ett till tre meningar som svar. Skriv det ni faktiskt säger i telefon. Undvik att svara ”det beror på” utan att säga vad det beror på."),
            ("h2", "Det syns på Google"),
            ("p", "Frågor och svar kan märkas upp så att Google visar dem direkt i sökresultatet, och AI-tjänster plockar gärna svar som är skrivna så här. Det ingår i den <a href=\"tjanster/seo-och-ai-optimering.html\">SEO och AI-optimering</a> vi gör på alla sidor vi bygger."),
        ],
    },
    {
        "slug": "google-foretagsprofil-for-sma-foretag", "title": "Google-företagsprofil: det viktigaste ni kan göra gratis",
        "terms": ['SEO', 'Guide'], "date": "9 februari 2026", "image": "home/svc-seo.jpg",
        "body": [
            ("p", "När någon söker på en tjänst och en ort visar Google först kartan med tre företag. Att hamna där kostar inget, men kräver att er företagsprofil är komplett och levande. Så här gör ni."),
            ("h2", "Fyll i allt"),
            ("ul", ["Rätt kategori först, till exempel Byggfirma eller Städfirma, och gärna fler kategorier för det ni också gör.", "Område ni jobbar i, öppettider och telefonnummer som stämmer med hemsidan.", "Länk till hemsidan, helst till startsidan.", "Egna bilder: verkstaden, bilarna, teamet, färdiga jobb."]),
            ("h2", "Recensioner väger tyngst"),
            ("p", "Antalet recensioner och hur nya de är påverkar placeringen mer än något annat ni kan styra själva. Be varje nöjd kund om en recension, direkt efter avslutat jobb, med en länk som går rakt till rutan där de skriver. Svara på alla recensioner, även de korta."),
            ("h2", "Håll profilen levande"),
            ("p", "Lägg upp ett inlägg då och då: ett nytt jobb, en ny tjänst, ett tips. Det behöver inte vara långt. Google ser att profilen sköts, och kunder ser att ni finns."),
            ("h2", "Hemsidan och profilen ska säga samma sak"),
            ("p", "Samma företagsnamn, samma adress, samma telefonnummer. Och hemsidan ska ha tydliga sidor för de tjänster ni angett i profilen. Det är så Google kopplar ihop dem. Läs mer om hur vi jobbar med <a href=\"tjanster/seo-och-ai-optimering.html\">SEO och AI-optimering</a>."),
        ],
    },
    {
        "slug": "aga-din-doman-och-e-post", "title": "Äg din domän och din e-post själv",
        "terms": ['Hemsidor', 'Guide'], "date": "26 januari 2026", "image": "home/process-2.jpg",
        "body": [
            ("p", "Domänen är företagets adress på nätet. Står den på byrån som byggde sidan, eller på en anställd som slutat, kan ni en dag stå utan både hemsida och e-post. Så här ser ni till att den är er."),
            ("h2", "Kolla vem som står som ägare"),
            ("p", "Logga in hos den där domänen köptes, ofta Loopia, One.com eller Binero. Står företaget som ägare med en e-postadress ni läser? Om ni inte vet var den är köpt, fråga den som byggde sidan. Svaret ska komma snabbt och utan förbehåll."),
            ("h2", "E-posten ska följa domänen"),
            ("ul", ["Använd adresser på er egen domän, som info@ertforetag.se, inte en gratisadress.", "Ha minst två personer som kan logga in på domänen och e-posten.", "Skriv ner var domänen är registrerad och när den förnyas."]),
            ("h2", "Så gör vi"),
            ("p", "I vårt <a href=\"avtal.html\">avtal</a> står det svart på vitt: beställaren äger sin domän. Vi hjälper till att köpa och koppla den, men den registreras alltid på er."),
        ],
    },
    {
        "slug": "fem-saker-att-fixa-pa-hemsidan-2026", "title": "Fem saker att fixa på hemsidan i januari",
        "terms": ['Hemsidor', 'Guide'], "date": "12 januari 2026", "image": "home/process-1.jpg",
        "body": [
            ("p", "Januari är den lugnaste månaden för många företag, och den bästa att lägga en timme på hemsidan. Här är fem saker som nästan alltid går att förbättra, i den ordning de brukar ge mest."),
            ("h2", "1. Kolla att telefonnumret går att trycka på"),
            ("p", "Öppna hemsidan i mobilen och tryck på numret. Ringer det inte direkt är det ett vanligt textfält, och då tappar ni samtal varje dag. Samma sak med e-postadressen: den ska öppna mejlprogrammet."),
            ("h2", "2. Uppdatera det som har ändrats"),
            ("ul", ["Öppettider, priser och vilka områden ni jobbar i.", "Personer som slutat eller börjat.", "Årtalet i sidfoten, om det står där.", "Bilder som inte längre visar hur det ser ut hos er."]),
            ("h2", "3. Läs texten som en kund"),
            ("p", "Besökaren vill veta tre saker inom några sekunder: vad gör ni, var gör ni det och hur tar jag kontakt. Står det inte i toppen av startsidan, flytta dit det. Allt annat kan komma längre ner."),
            ("h2", "4. Testa hastigheten"),
            ("p", "En långsam sida tappar besökare innan den ens har laddat. Stora bilder är den vanligaste orsaken. Vårt verktyg <a href=\"testa.html\">Testa din sajt</a> ger ett betyg på prestanda, tillgänglighet och SEO på ungefär en halv minut."),
            ("h2", "5. Be om en recension"),
            ("p", "Nöjda kunder från hösten har inte glömt er än. Ett kort mejl med länk till er Google-profil räcker. Recensionerna syns både på Google och, om ni lägger in dem, på hemsidan."),
            ("h2", "Vill ni ha hjälp?"),
            ("p", "Vi går igenom hemsidan gratis och säger vad som är värt att ändra. Och behöver ni en ny: <a href=\"priser.html\">våra priser</a> är fasta, från 3 000 kr."),
        ],
    },
]

# Technologies used to build this site.
PLATFORMS = [
    {
        "slug": "html-css", "name": "HTML & CSS", "icon": "tech-1.svg",
        "card": "Grunden i allt vi bygger. Semantisk HTML och modern CSS ger snabba, tillgängliga sidor.",
        "lead": "Grunden i allt som visas i en webbläsare – och det som avgör om en sida känns snabb, tydlig och tillgänglig.",
        "intro": "Ramverk kommer och går, men allt som syns på skärmen blir till slut HTML och CSS. Vi lägger mycket omsorg på semantisk struktur och väl organiserad CSS, eftersom det är där prestanda och tillgänglighet vinns eller förloras.",
        "uses": [("Semantisk struktur", "Rätt element för rätt innehåll gör sidan begriplig för både skärmläsare och sökmotorer."),
                 ("Moderna layouter", "Flexbox, grid och scroll-snap ger responsiva layouter utan tunga bibliotek."),
                 ("Designvariabler", "Färger, typografi och avstånd samlas i CSS-variabler som gör teman enkla att byta.")],
        "here": ["Hela den här sajten är handskriven HTML och CSS utan ramverk.",
                 "Den gröna och beige färgskalan styrs av ett fåtal CSS-variabler, så hela sajten kan byta färg genom att ändra dem.",
                 "Karusellerna på mobil är byggda med scroll-snap i ren CSS."],
    },
    {
        "slug": "javascript", "name": "JavaScript", "icon": "tech-2.svg",
        "card": "Interaktivitet i webbläsaren – från menyer och flikar till animationer som startar vid scroll.",
        "lead": "Språket som gör webbsidor interaktiva, och som vi använder både i webbläsaren och på servern.",
        "intro": "Vi använder JavaScript där det tillför något: menyer, formulär, animationer och dynamiskt innehåll. Sidan ska fungera även om skriptet inte hunnit laddas, och vi skickar så lite kod som möjligt till besökaren.",
        "uses": [("Progressiv förbättring", "Grundfunktionen fungerar utan skript – JavaScript gör upplevelsen bättre, inte möjlig."),
                 ("Tillgänglig interaktion", "Menyer och flikar som styrs med tangentbord och berättar sitt läge för skärmläsare."),
                 ("Prestanda", "Små, fokuserade skript utan onödiga beroenden.")],
        "here": ["Megamenyn, hamburgermenyn och recensionskarusellen styrs av några få rader JavaScript.",
                 "Korten som tonar in när man scrollar använder IntersectionObserver.",
                 "Allt respekterar inställningen för reducerad rörelse i operativsystemet."],
    },
    {
        "slug": "react", "name": "React", "icon": "tech-3.svg",
        "card": "Vårt förstahandsval för appar och avancerade gränssnitt med mycket tillstånd.",
        "lead": "Ett bibliotek för att bygga gränssnitt av återanvändbara komponenter – perfekt när en tjänst har mycket interaktion.",
        "intro": "När en tjänst behöver hantera mycket tillstånd – inloggning, filter, formulär i flera steg eller realtidsdata – blir React ofta rätt verktyg. Komponenttänket passar också bra ihop med ett designsystem.",
        "uses": [("Webbappar och portaler", "Kundportaler, bokningsflöden och verktyg med mycket logik i gränssnittet."),
                 ("Designsystem i kod", "Komponenter som speglar designsystemet och delas mellan flera produkter."),
                 ("Server-rendering", "Tillsammans med ramverk som Next.js för snabba första visningar och bra sökbarhet.")],
        "here": ["Den här sajten behövde inte React – en statisk sajt med lite JavaScript räckte gott och blir dessutom snabbare.",
                 "Att välja bort ett ramverk när det inte behövs är också ett tekniskt beslut vi gärna tar."],
    },
    {
        "slug": "node-js", "name": "Node.js", "icon": "tech-4.svg",
        "card": "JavaScript på servern – för API:er, byggverktyg och automatiserade tester.",
        "lead": "En plattform för att köra JavaScript utanför webbläsaren – på servrar, i byggsteg och i testmiljöer.",
        "intro": "Node.js låter oss använda samma språk i hela kedjan. Vi använder det för API:er och integrationer, men lika ofta för de verktyg som gör utvecklingsarbetet snabbare och säkrare.",
        "uses": [("API:er och integrationer", "Lätta tjänster som kopplar ihop webbplatsen med affärssystem och tredjepartstjänster."),
                 ("Byggverktyg", "Kompilering, optimering av bilder och generering av sidor."),
                 ("Testautomation", "Skript som kör webbläsartester och jämför skärmdumpar.")],
        "here": ["Skärmdumparna och testerna av den här sajten körs med Node.js-skript.",
                 "PDF:en med vårt exempelavtal skapas automatiskt från avtalssidan med ett Node.js-skript."],
    },
    {
        "slug": "python", "name": "Python", "icon": "tech-5.svg",
        "card": "För automatisering, dataanalys och verktyg som genererar innehåll och bilder.",
        "lead": "Ett lättläst språk som är oslagbart för automatisering, analys och verktyg som sparar tid.",
        "intro": "Python använder vi när något behöver räknas, analyseras eller automatiseras: dataanalys, migrering av innehåll, bildbehandling och små verktyg som gör ett återkommande jobb på sekunder.",
        "uses": [("Innehållsmigrering", "Flytt av tusentals sidor och bilder mellan system utan manuellt arbete."),
                 ("Dataanalys", "Bearbetning av besöks- och försäljningsdata inför beslut."),
                 ("Generering", "Statiska sidor, bilder och rapporter som skapas automatiskt.")],
        "here": ["Alla undersidor på den här sajten genereras av ett litet Python-skript med gemensam header och footer.",
                 "Den stora 404-siffran ritades om till en SVG direkt från typsnittets konturer med Python.",
                 "Bilderna på sajten beskärs och komprimeras automatiskt med Pillow."],
    },
    {
        "slug": "playwright", "name": "Playwright", "icon": "tech-6.svg",
        "card": "Automatiserade tester i riktiga webbläsare, inklusive visuella jämförelser.",
        "lead": "Ett verktyg för att styra riktiga webbläsare automatiskt – för tester, skärmdumpar och kvalitetskontroll.",
        "intro": "Med Playwright klickar, skriver och scrollar vi oss igenom tjänster precis som en användare – fast tusentals gånger och på flera webbläsare. Det fångar fel innan de når produktion.",
        "uses": [("Flödestester", "Viktiga flöden som köp, inloggning och formulär testas vid varje ändring."),
                 ("Visuell regression", "Skärmdumpar jämförs pixel för pixel för att upptäcka oavsiktliga ändringar."),
                 ("Flera enheter", "Samma tester körs i olika skärmstorlekar och webbläsare.")],
        "here": ["Varje sida testas vid 1440, 1024 och 390 pixlars bredd innan den publiceras.",
                 "Testerna kontrollerar att ingen sida går att scrolla i sidled på mobilen.",
                 "Menyer, flikar och formulär klickas igenom automatiskt för att hitta fel."],
    },
]

PARENT_COMPANY = "PJM Projekteffektivitet AB"
# Elevate Studio is a brand (trade name) of the parent company; this is the parent company's number.
ORG_NR = "556969-4358"

# Frequently asked questions: shown on the start page, in structured data and in llms.txt.
FAQ = [
    ("Vad kostar en hemsida?", 'Ni får ett fast pris innan vi börjar. Starter kostar 3 000 kr och Pro 6 000 kr i startavgift, plus en låg årsavgift. Större projekt får ett fast pris i en offert. <a href="priser.html">Se våra priser</a> eller <a href="avtal.html">ett exempel på hur ett avtal ser ut</a>.'),
    ("Hur lång tid tar det?", "Ni ser ett första utkast av hemsidan redan efter ungefär en dag. Sedan finjusterar vi tillsammans tills ni är nöjda. Hur snabbt den går live beror mest på när vi har fått texter, bilder och åtkomst."),
    ("Bygger ni hemsidor för alla typer av företag?", "Ja. Vi bygger hemsidor för företag i alla storlekar – från enmansföretag till större bolag med flera avdelningar och system som ska kopplas ihop. Större projekt får ett fast pris i en offert."),
    ("Jobbar ni bara i Uppsala?", "Nej. Vi finns i Uppsala men bygger hemsidor åt företag i hela Sverige. Möten går lika bra på distans."),
    ("Vad behöver vi bidra med?", "Kunskapen om ert företag: vad ni gör, vilka kunder ni vill ha och de bilder och texter ni redan har. Ni får två korrekturvändor innan sidan lanseras, så att allt blir rätt."),
    ("Ingår support efter lansering?", "Ja. Under första året ingår upp till 10 timmars support och redigering per månad – till exempel text- och bildändringar, layoutjusteringar eller nya funktioner."),
    ("Syns hemsidan på Google?", "Grundläggande sökmotoroptimering (SEO) och AI-optimering ingår, så att sidan går att hitta både på Google och i AI-tjänster som svarar på frågor."),
    ("Kan ni koppla på bokning, offertformulär eller AI-chatt?", "Ja. Vi bygger bokningssystem, offertsystem, AI-chatt och notiser via e-post och SMS – och testar allt innan lansering."),
    ("Vem äger domänen?", "Ni. Domänen är och förblir er. Hosting och eventuella externa avgifter står specificerade i offerten."),
    ("Hur godkänner vi offerten?", "Ni svarar på mejlet med offerten och skriver att ni godkänner den. Inga krångliga underskrifter."),
]

# Opens the Google review box for Elevate Studio directly. This is where g.page/r/CaJmmZVCdm82EBM/review
# leads; linking straight here avoids the redirect warning Gmail shows for short links.
REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJcRLSybPJX0YRomaZlUJ2bzY"

# Real customer reviews from Google. Add new ones at the top; arrows appear automatically when there is more than one.
REVIEWS = [
    {"text": "Väldigt nöjd med hemsidan som Elevate Studio byggt åt oss! Snygg design, smidig kontakt och bra hjälp hela vägen. Rekommenderas varmt till företag som behöver en ny hemsida.", "source": "Recension på Google"},
    {"text": "Gjorde en väldigt bra och professionell hemsida åt oss. Mycket nöjd med detta. Kan varmt rekommendera!", "source": "Hemmacykel · Recension på Google"},
    {"text": "Väl utfört arbete med vår hemsida, vi märker redan skillnad på inflöde av förfrågningar till våra tjänster.", "source": "Recension på Google"},
]

# Oscar: byt till oskar@elevatestudio.nu (även i supabase/functions/mail/templates.ts) när adressen är öppnad hos Loopia
TEAM = [
                ("Carl From", "Försäljning & kundkontakt", "+46 76 022 83 61", "carl@elevatestudio.nu"),
                ("Isak Mattsson", "Försäljning & AI-utveckling", "+46 70 289 58 75", "isak@elevatestudio.nu"),
                ("Oscar Svanerud", "Försäljning & affärsutveckling", "+46 76 849 86 68", "svanerudo@gmail.com"),
            ]

# Websites we have built and that are live. Add a line here and a screenshot in assets/img/sites/ to show one more.
SITES = [
    {"name": "Haninge Byggteam AB", "url": "https://haningebyggteam.se/", "label": "haningebyggteam.se", "what": "Byggfirma i Stockholm", "image": "sites/site-haninge.jpg", "phone": "sites/site-haninge-phone.jpg", "logo": "home/client-haninge.png",
     "text": "Haninge Byggteam renoverar kök, badrum och hela villor i Stockholm och på Södertörn. Hemsidan är byggd runt en enda sak: att den som tittar ska be om en offert. Därför ligger knappen Få gratis offert i varje del av sidan, projektgalleriet går att filtrera på kök, badrum, totalrenovering och utomhus, och deras 5,0 i Google-betyg syns redan i toppen."},
    {"name": "Alvhem Städ", "url": "https://elevatestudio018.github.io/alvhemstad/", "label": "Alvhem Städ", "what": "Städfirma i Älvängen", "image": "sites/site-alvhem.jpg", "phone": "sites/site-alvhem-phone.jpg", "logo": "home/client-alvhemstad.png", "case": "projekt/alvhem-stad.html",
     "text": "Alvhem Städ erbjuder hemstädning, storstädning, flyttstädning och kontorsstädning till fasta priser. Sajten öppnar med en film som visar jobbet, varje städtjänst har en egen sida med pris, och en kalkyl räknar av RUT-avdraget direkt så kunden ser vad det kostar. Uppstartsmötet bokas från vilken sida som helst."},
    {"name": "Markmontage BEAB AB", "url": "https://elevatestudio018.github.io/Bugg-test/", "label": "Markmontage BEAB AB", "what": "Mark- och grundarbeten i Kungälv och Göteborg", "image": "sites/site-markmontage.jpg", "phone": "sites/site-markmontage-phone.jpg", "logo": "home/client-markmontage.png",
     "text": "Markmontage har gjort schakt, dränering, grundläggning och VA-arbeten sedan 2002 med 18 anställda. Hemsidan presenterar sju tjänster på egna sidor, visar utförda uppdrag med egna bilder från arbetsplatserna och förklarar steg för steg hur ett markprojekt går till, från kostnadsfritt hembesök till fast offert."},
]

import json as _json, pathlib as _pl
# Sites made as proposals for companies (not customers): screenshots and texts from tools/proposals.json
PROPOSALS = _json.loads((_pl.Path(__file__).parent / "proposals.json").read_text(encoding="utf-8"))

SIMPLE_PAGES = {
    "byggda-hemsidor": {
        "title": "Hemsidor vi byggt", "seo_title": "Hemsidor vi byggt – riktiga kunder, riktiga sajter",
        "lead": "Dator och mobil, samma sajt. Klicka på ett kort så öppnas hemsidan här på sidan, i dator- eller mobilvy.",
        "description": "Se hemsidor som Elevate Studio har byggt åt riktiga företag: byggfirma, städfirma och markentreprenad. Besök sajterna och se hur de fungerar på dator och mobil.",
        "sections": [
            ("sites", SITES),
            ("h2", "Förslag vi har tagit fram"),
            ("text", "Det här är hemsidor vi har byggt som förslag och exempel för olika företag. De är inte beställda av företagen, utan visar hur vi arbetar i olika branscher. Klicka på ett kort för att se hur hemsidan fungerar på dator och mobil."),
            ("sites2", PROPOSALS),
            ("text", "Varje hemsida är byggd från grunden för företaget bakom den: egna texter, egna bilder och kontakt eller offert på varje sida. Vill ni se hur er egen skulle kunna se ut? Hör av er, så gör vi ett första utkast."),
        ],
    },
    "kontakt": {
        "title": "Kontakt", "seo_title": "Kontakta oss – webbyrå i Uppsala", "lead": "Låt oss prata om er hemsida.",
        "description": "Kontakta Elevate Studio i Uppsala. Ring eller mejla Carl, Isak eller Oscar, skriv till info@elevatestudio.nu eller fyll i formuläret.",
        "sections": [
            ("contacthero", None),
            ("contacts", TEAM),
            ("form", None),
            ("nextsteps", [("Vi hör av oss", "Vi läser er förfrågan och återkommer så fort vi kan – oftast med ett förslag på tid för ett kort möte."),
                           ("Första mötet", "Vi pratar om ert företag, era kunder och vad hemsidan ska ge. Det kostar ingenting."),
                           ("Ni får en offert", "Ett fast pris och en tydlig plan på två sidor. Ni godkänner genom att svara på mejlet.")]),
            ("minifaq", None),
        ],
    },
    "om": {
        "title": "Om oss", "seo_title": "Om oss – webbyrån bakom Elevate Studio i Uppsala", "lead": "Elevate Studio är ett litet team i Uppsala som bygger hemsidor som ger förfrågningar – för företag i alla storlekar, i hela Sverige.",
        "description": "Elevate Studio är en webbyrå i Uppsala, ett varumärke under PJM Projekteffektivitet AB. Vi bygger hemsidor med bokning, offert och AI-chatt till fast pris.",
        "sections": [
            ("text", "Vi startade Elevate Studio för att det ska vara enkelt för företag att få en hemsida som faktiskt ger kunder. Många företag har en hemsida som ser okej ut men som inte ger några förfrågningar – eller ingen hemsida alls, för att det känns dyrt och krångligt. Vi vill ändra på det: ett fast pris innan vi börjar, ett första utkast redan efter ungefär en dag och samma kontaktperson hela vägen."),
            ("cols", [("Fast pris", "Ni vet vad det kostar innan vi börjar. Allt står i en tydlig offert på två sidor."),
                      ("Samma kontaktperson", "Inga mellanhänder. Ni pratar med någon som kan ert företag."),
                      ("Ni äger er domän", "Domänen är och förblir er – oavsett vad som händer.")]),
            ("ceo", None),
            ("team", TEAM),
            ("review", None),
            ("aboutlinks", None),
        ],
    },
    "english": {
        "title": "In English", "lead": "Elevate Studio is a web agency in Uppsala, Sweden.",
        "description": "Elevate Studio is a web agency in Uppsala, Sweden, building fast websites with booking, quote forms and AI chat at a fixed price.",
        "sections": [
            ("text", "We build fast, mobile-friendly websites that bring in enquiries – with booking, quote forms, AI chat, SEO and ongoing support. You get a fixed price before we start, and you always talk to the same person. We mainly work in Swedish, but are happy to help in English. Get in touch at info@elevatestudio.nu."),
            ("links", [("Prices (in Swedish)", "priser.html"), ("Contact", "kontakt.html"), ("Back to the start page", "index.html")]),
        ],
    },
    "integritet": {
        "title": "Integritetspolicy", "lead": "Så hanterar vi personuppgifter när du kontaktar oss eller besöker vår webbplats.",
        "description": "Så hanterar Elevate Studio personuppgifter från kontaktformulär och nyhetsbrev.",
        "sections": [
            ("cols", [("När du kontaktar oss", "Personuppgiftsansvarig är PJM Projekteffektivitet AB (org.nr 556969-4358), som Elevate Studio är ett varumärke för. Det du skriver i våra formulär – namn, e-post, telefon, företag och meddelande – skickas till info@elevatestudio.nu och sparas i vårt kundregister. Mejl från oss, som bekräftelser och nyhetsbrev, skickas från info@elevatestudio.nu via e-posttjänsten Brevo. Anmäler du dig till nyhetsbrevet sparas din e-post i Brevo tills du avslutar prenumerationen, vilket du kan göra med en länk i varje utskick. Vi använder uppgifterna bara för att svara dig och skicka det du har bett om, och sparar dem inte längre än vi behöver."),
                      ("Anonym besöksstatistik", "Webbplatsen sätter inga cookies. Vi för anonym statistik över vilka sidor som besöks, hur länge och varifrån besökaren kom, för att kunna förbättra sidan. Ingen IP-adress sparas och statistiken går inte att koppla till en person. Vi använder inga annonsverktyg."),
                      ("Dina rättigheter", "Du har rätt att få veta vilka uppgifter vi har om dig, och att få dem rättade eller raderade. Mejla info@elevatestudio.nu så hjälper vi dig. Du kan också vända dig till Integritetsskyddsmyndigheten (IMY).")]),
            ("links", [("Om cookies", "cookies.html"), ("Kontakta oss", "kontakt.html")]),
        ],
    },
    "cookies": {
        "title": "Om cookies", "seo_title": "Om cookies på elevatestudio.nu", "lead": "Vi använder inga cookies.",
        "description": "Elevate Studios webbplats sätter inga cookies. Besöksstatistiken är anonym och sparar ingen IP-adress.",
        "sections": [
            ("cols", [("Inga cookies", "Webbplatsen sätter inga cookies, varken egna eller från andra. Därför finns det heller ingen cookieruta att godkänna."),
                      ("Ingen statistik eller annonsering", "Vi använder inga analysverktyg som Google Analytics och inga annonsspårare."),
                      ("Formulär", "Det du skriver i ett formulär skickas till oss när du trycker på skicka. Läs mer i vår integritetspolicy.")]),
            ("links", [("Integritetspolicy", "integritet.html"), ("Kontakta oss", "kontakt.html")]),
        ],
    },
}


# Landing pages for common searches. Every fact here is also stated elsewhere on the site.
LANDINGS = [
    {
        "slug": "webbyra-uppsala", "title": "Webbyrå Uppsala – hemsidor till fast pris från 3 000 kr",
        "h1": "Webbyrå i <em>Uppsala</em>",
        "description": "Webbyrå i Uppsala som bygger hemsidor för företag till fast pris från 3 000 kr. Första utkastet efter ungefär en dag. Möt oss i Uppsala eller på distans.",
        "lead": "Vi är en liten webbyrå i Uppsala som bygger hemsidor som ger förfrågningar – för företag i Uppsala, i hela Uppsala län och i resten av Sverige.",
        "sections": [
            ("Lokal webbyrå – samma kontaktperson hela vägen", ["Som företag i Uppsala kan ni träffa oss på plats, men det går lika bra att ses på distans. Ni pratar med samma person från första mötet till uppföljningen varje månad – inga mellanhänder och inga långa mejltrådar."]),
            ("Det här gör en webbyrå åt er", ["Snabba, mobilanpassade hemsidor med tydliga tjänstesidor och kontakt på varje sida.", "Bokningssystem och offertformulär direkt på hemsidan.", "AI-chatt som svarar på kundernas vanliga frågor.", "SEO och AI-optimering så att ni syns på Google och i AI-sök.", "Support och underhåll efter lansering."]),
            ("Så går det till", ["Första mötet: vi lär känna ert företag, era kunder och vad hemsidan ska ge.", "Utkast på en dag: ni ser ett första utkast efter ungefär en dag.", "Finjustering: ni får två korrekturvändor, så att allt blir rätt.", "Lansering: sidan går live, indexeras av Google och börjar ta emot förfrågningar."]),
            ("Fast pris och tydligt avtal", ["Starter kostar 3 000 kr och Pro 6 000 kr i startavgift, plus en låg årsavgift. Större projekt får ett fast pris i en offert. Ni får allt på två sidor och godkänner genom att svara på mejlet."]),
            ("Webbdesign och webbutveckling i Uppsala", ["Behöver ni en ny hemsida i Uppsala, eller vill ni bygga om den ni har? Vi står för både webbdesign och webbutveckling – från första skissen till en färdig sida som fungerar på mobilen, syns på Google och tar emot förfrågningar. Vill ni synas bättre lokalt hjälper vi också till med SEO i Uppsala med omnejd."]),
            ("Syns när kunder i Uppsala söker", ["När någon söker på en tjänst i Uppsala visar Google först de företag som har en tydlig hemsida, en komplett företagsprofil och bra recensioner. Vi bygger sidan så att Google förstår vad ni gör och var ni finns – och så att AI-tjänster som ChatGPT kan beskriva er rätt när någon frågar efter ett företag i närheten."]),
            ("Vi hjälper företag i hela Uppsala län", ["Uppsala, Knivsta, Enköping, Östhammar, Tierp, Heby och Älvkarleby – och gärna Sigtuna, Märsta och Stockholm också. Vi träffas där det passar er eller på distans."]),
        ],
        "faq": [("Kan vi träffas i Uppsala?", "Ja. Vi finns i Uppsala och träffar gärna kunder på plats. Möten går också bra på distans."),
                ("Vad kostar en hemsida hos en webbyrå i Uppsala?", "Hos oss kostar Starter 3 000 kr och Pro 6 000 kr i startavgift, plus en låg årsavgift. Större projekt får ett fast pris i en offert innan vi börjar."),
                ("Vad gör en webbyrå?", "En webbyrå planerar, designar och bygger hemsidor – och hjälper ofta till med sådant som SEO, bokning, formulär och support efter lansering. Hos oss ingår grundläggande SEO och AI-optimering i alla hemsidor."),
                ("Hur väljer man webbyrå?", "Fråga efter ett fast pris, vem som äger domänen, vad som ingår i supporten och vad det kostar efter första året. Be också att få se exempel på hemsidor byrån har byggt."),
                ("Bygger ni hemsidor för företag utanför Uppsala?", "Ja. Vi bygger hemsidor åt företag i hela Sverige."),
                ("Hur lång tid tar det?", "Ni ser ett första utkast av hemsidan redan efter ungefär en dag. Sedan finjusterar vi tillsammans tills ni är nöjda. Hur snabbt den går live beror mest på när vi har fått texter, bilder och åtkomst.")],
    },
    {
        "slug": "webbyra-stockholm", "title": "Webbyrå Stockholm – hemsidor till fast pris från 3 000 kr",
        "h1": "Webbyrå för företag i <em>Stockholm</em>",
        "description": "Webbyrå som bygger hemsidor för företag i Stockholm till fast pris från 3 000 kr. Första utkastet efter ungefär en dag. Möten på distans eller hos er.",
        "lead": "Vi är en liten webbyrå i Uppsala som bygger hemsidor som ger förfrågningar – för företag i Stockholm, i hela Stockholms län och i resten av Sverige.",
        "sections": [
            ("Webbyrå för Stockholm – med bas i Uppsala", ["Vi finns i Uppsala, fyrtio minuter från Stockholm, och bygger hemsidor åt företag i hela Stockholmsområdet. De flesta möten sker på distans, men vi kommer gärna till er när det behövs. Ni pratar med samma person från första mötet till uppföljningen varje månad – inga mellanhänder och inga långa mejltrådar."]),
            ("Det här gör vi åt er", ["Snabba, mobilanpassade hemsidor med tydliga tjänstesidor och kontakt på varje sida.", "Bokningssystem och offertformulär direkt på hemsidan.", "AI-chatt som svarar på kundernas vanliga frågor.", "SEO och AI-optimering så att ni syns på Google och i AI-sök.", "Support och underhåll efter lansering."]),
            ("Så går det till", ["Första mötet: vi lär känna ert företag, era kunder och vad hemsidan ska ge.", "Utkast på en dag: ni ser ett första utkast efter ungefär en dag.", "Finjustering: ni får två korrekturvändor, så att allt blir rätt.", "Lansering: sidan går live, indexeras av Google och börjar ta emot förfrågningar."]),
            ("Fast pris och tydligt avtal", ["Starter kostar 3 000 kr och Pro 6 000 kr i startavgift, plus en låg årsavgift. Större projekt får ett fast pris i en offert. Ni får allt på två sidor och godkänner genom att svara på mejlet."]),
            ("Syns när kunder i Stockholm söker", ["Stockholm är den tuffaste marknaden i Sverige att synas på. Därför bygger vi sidan så att Google förstår exakt vilka tjänster ni erbjuder och i vilka områden – och så att AI-tjänster som ChatGPT kan beskriva er rätt när någon frågar efter ett företag som ert i Stockholm."]),
            ("Vi hjälper företag i hela Stockholms län", ["Stockholm, Solna, Sundbyberg, Nacka, Täby, Sollentuna, Huddinge, Järfälla, Sigtuna och Norrtälje – och förstås Uppsala. Vi träffas där det passar er eller på distans."]),
        ],
        "faq": [("Finns ni i Stockholm?", "Vi finns i Uppsala och jobbar med företag i hela Stockholmsområdet. Möten sker på distans eller på plats hos er när det behövs."),
                ("Vad kostar en hemsida för ett företag i Stockholm?", "Samma fasta priser som överallt: Starter 3 000 kr och Pro 6 000 kr i startavgift, plus en låg årsavgift. Större projekt får ett fast pris i en offert innan vi börjar."),
                ("Hur snabbt kan vi få en hemsida?", "Ni ser ett första utkast efter ungefär en dag. Hur snabbt sidan går live beror mest på när vi har fått texter, bilder och åtkomst."),
                ("Kan ni hjälpa oss att synas i Stockholm?", "Ja. Grundläggande SEO och AI-optimering ingår i alla hemsidor, och vi bygger sidan så att den tydligt visar vilka tjänster ni erbjuder och var.")],
    },
    {
        "slug": "hemsida-for-hantverkare", "title": "Hemsida för hantverkare – med offertformulär",
        "h1": "Hemsida för <em>hantverkare</em>",
        "description": "Hemsida för snickare, elektriker, rörmokare, målare och byggföretag – med offertformulär, tjänstesidor och synlighet på Google. Fast pris från 3 000 kr.",
        "lead": "För snickare, elektriker, rörmokare, målare och byggföretag: en hemsida som visar vad ni gör och gör det enkelt för kunderna att begära offert.",
        "sections": [
            ("Det här behöver en hantverkare på sin hemsida", ["En tydlig rubrik som säger vad ni gör och var ni jobbar.", "En egen sida för varje tjänst – till exempel badrum, kök eller tak.", "Bilder på riktiga jobb som visar vad ni kan.", "Telefonnummer och offertknapp på varje sida.", "En sida som fungerar perfekt på mobilen, där de flesta kunder söker."]),
            ("Offertformulär som sparar tid", ["Med ett offertflöde beskriver kunden jobbet steg för steg och kan bifoga bilder. Ni får en komplett förfrågan och slipper ringa tillbaka för att fråga om grundläggande saker."]),
            ("Synas när kunderna söker lokalt", ["Vi bygger sidan så att Google förstår vilka tjänster ni erbjuder och på vilka orter – och så att AI-tjänster kan beskriva er rätt när någon frågar efter en hantverkare i närheten."]),
        ],
        "faq": [("Vad kostar en hemsida för hantverkare?", "Starter kostar 3 000 kr och Pro, med offertflöde eller bokning, 6 000 kr i startavgift plus en låg årsavgift."),
                ("Kan kunderna skicka bilder i offertformuläret?", "Ja, kunden kan bifoga bilder eller beskrivningar direkt i förfrågan."),
                ("Har ni ett exempel?", "Ja, Lindvik Bygg är en hemsida vi har byggt som visar hur en hemsida för ett byggföretag kan se ut.")],
    },
    {
        "slug": "billig-hemsida", "title": "Billig hemsida för företag – fast pris från 3 000 kr",
        "h1": "Prisvärd hemsida <em>till fast pris</em>",
        "description": "Billig hemsida för företag utan att snåla på kvaliteten: mobilanpassad, SEO-optimerad och med support första året. Fast pris från 3 000 kr exkl. moms.",
        "lead": "En hemsida behöver inte kosta tiotusentals kronor. Hos oss får ni en snabb, mobilanpassad hemsida till fast pris från 3 000 kr.",
        "sections": [
            ("Det här ingår i Starter", ["Webbdesign och mobilanpassning utifrån er verksamhet.", "Kontaktfunktion och presentation av verksamhet och projekt.", "Grundläggande SEO och AI-optimering.", "Två korrekturvändor före leverans.", "Upp till 10 timmars support och redigering per månad första året."]),
            ("Vad kostar det efteråt?", ["Startavgiften är 3 000 kr. Därefter betalar ni en årsavgift på 99–199 kr per år. Hosting och eventuella externa avgifter står specificerade i offerten, så att ni vet exakt vad som gäller."]),
            ("Behöver ni mer?", ["Pro för 6 000 kr lägger till bokning eller offertflöde, AI-chatt och notiser via e-post och SMS. Större projekt får ett fast pris i en offert."]),
        ],
        "faq": [("Varför är det så billigt?", "Vi är ett litet team med låga omkostnader och bygger effektivt – därför kan vi hålla ett lågt fast pris."),
                ("Finns det dolda avgifter?", "Nej. Startavgift och årsavgift står i offerten, och hosting och eventuella externa avgifter specificeras där också."),
                ("Äger vi hemsidans domän?", "Ja. Domänen är och förblir er.")],
    },
]

# 30 extra landing pages (trades, towns, topics), generated in landings_gen.py
from landings_gen import generate as _generate_landings  # noqa: E402
LANDINGS = LANDINGS + _generate_landings()
