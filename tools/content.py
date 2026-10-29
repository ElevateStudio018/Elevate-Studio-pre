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
        "terms": ["Hemsidor", "Guide"], "date": "28 oktober 2026", "image": "home/about-2.jpg",
        "body": [
            ("p", "Det har aldrig varit enklare att skapa en hemsida själv. Med verktyg som Wix, Squarespace och WordPress kan vem som helst få upp en sida på en kväll. Frågan är snarare vad hemsidan ska göra för ditt företag – och vad din tid är värd."),
            ("h2", "När det räcker att bygga hemsidan själv"),
            ("ul", ["Du behöver bara ett enkelt visitkort på nätet med kontaktuppgifter.",
                    "Du har tid och tycker att det är roligt att lära dig verktyget.",
                    "Det är inte så viktigt att synas högt på Google."]),
            ("h2", "När en webbyrå lönar sig"),
            ("ul", ["Hemsidan ska ge förfrågningar, inte bara finnas.",
                    "Du vill synas när kunder söker på din tjänst på din ort.",
                    "Du behöver bokning, offertformulär eller en chatt som svarar kunderna.",
                    "Du vill slippa tekniken och lägga tiden på ditt eget jobb."]),
            ("h2", "Det många glömmer när de skapar hemsidan själva"),
            ("ul", ["Tiden: att bygga, skriva texter och hålla sidan uppdaterad tar ofta mycket längre tid än man tror.",
                    "Löpande kostnader: byggverktygen tar ofta en månadsavgift så länge sidan finns.",
                    "Synligheten: en snygg mall syns inte automatiskt på Google – det kräver tydliga tjänstesidor, rätt rubriker och snabba sidor."]),
            ("h2", "Så gör vi"),
            ("p", "Som webbyrå i Uppsala bygger vi hemsidor till fast pris: Starter kostar 3 000 kr i startavgift och därefter 99–199 kr per år. Du ser ett första utkast efter ungefär en dag, domänen är alltid din och under första året ingår upp till 10 timmars support och ändringar per månad."),
        ],
    },
    {
        "slug": "vad-kostar-en-hemsida", "title": "Vad kostar en hemsida – och vad betalar du egentligen för?",
        "terms": ["Priser", "Guide"], "date": "27 oktober 2026", "image": "home/post-3.jpg",
        "body": [
            ("p", "Frågan om vad en hemsida kostar får svar som spretar från några hundralappar till hundratusentals kronor. Skillnaden ligger sällan i själva sidan, utan i vad som ingår – och i vad som tillkommer efteråt."),
            ("h2", "Det här brukar priset bestå av"),
            ("ul", ["En startkostnad för design och bygge av sidan.",
                    "En löpande kostnad för domän, drift och hosting.",
                    "Support och ändringar efter lansering – ingår de, eller betalar du per timme?",
                    "Funktioner som bokning, offertformulär eller chatt, som ofta prissätts separat."]),
            ("h2", "Fem frågor att ställa innan du väljer leverantör"),
            ("ul", ["Är priset fast, eller kan det bli dyrare under arbetets gång?",
                    "Vem äger domänen – du eller leverantören?",
                    "Vad ingår i supporten, och hur länge?",
                    "Vad kostar det efter första året?",
                    "Finns det någon bindningstid?"]),
            ("h2", "Så gör vi"),
            ("p", "Hos oss får du ett fast pris i en offert innan vi börjar. Starter kostar 3 000 kr i startavgift och därefter 99–199 kr per år, och under första året ingår upp till 10 timmars support och ändringar per månad. Domänen är alltid din. På vår prissida ser du vad som ingår i varje paket, och du kan ladda ner ett exempel på hur vårt avtal ser ut."),
        ],
    },
    {
        "slug": "fa-besokare-att-hora-av-sig", "title": "Fem saker som får besökare att höra av sig",
        "terms": ["Hemsidor", "Guide"], "date": "20 oktober 2026", "image": "home/post-2.jpg",
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
        "terms": ["AI", "SEO"], "date": "13 oktober 2026", "image": "home/post-1.jpg",
        "body": [
            ("p", "Allt fler söker inte längre bara på Google, utan ställer frågan direkt till en AI-assistent: ”Vilken snickare i Haninge kan bygga om mitt kök?” Svaret bygger på det som finns att läsa om ditt företag på nätet – och då behöver din hemsida säga rätt saker, på rätt sätt."),
            ("h2", "Från placering till omnämnande"),
            ("p", "I vanlig sökning handlar det om att hamna högt i en lista. I ett AI-svar finns ingen lista – antingen nämns ditt företag, eller så gör det inte det. Och när det nämns måste informationen stämma."),
            ("h2", "Tre saker att börja med"),
            ("ul", ["Beskriv tydligt vad ni gör, för vem och var – med samma ord på alla sidor.",
                    "Svara på de frågor kunderna faktiskt ställer, till exempel i en sektion med vanliga frågor.",
                    "Håll kontaktuppgifter, öppettider och tjänster uppdaterade, både på sajten och i Googles företagsprofil."]),
            ("p", "Det mesta som gör dig synlig för AI gör dig också bättre på Google. Därför ingår både sökmotoroptimering (SEO) och AI-optimering i alla hemsidor vi bygger."),
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
    {"name": "Alvhem Städ", "url": "https://alvhemstad.se/", "label": "alvhemstad.se", "what": "Städfirma i Älvängen", "image": "sites/site-alvhem.jpg", "phone": "sites/site-alvhem-phone.jpg", "logo": "home/client-alvhemstad.png", "case": "projekt/alvhem-stad.html",
     "text": "Alvhem Städ erbjuder hemstädning, storstädning, flyttstädning och kontorsstädning till fasta priser. Sajten öppnar med en film som visar jobbet, varje städtjänst har en egen sida med pris, och en kalkyl räknar av RUT-avdraget direkt så kunden ser vad det kostar. Uppstartsmötet bokas från vilken sida som helst."},
    {"name": "Markmontage BEAB AB", "url": "https://elevatestudio018.github.io/Bugg-test/", "label": "Markmontage BEAB AB", "what": "Mark- och grundarbeten i Kungälv och Göteborg", "image": "sites/site-markmontage.jpg", "phone": "sites/site-markmontage-phone.jpg", "logo": "home/client-markmontage.png",
     "text": "Markmontage har gjort schakt, dränering, grundläggning och VA-arbeten sedan 2002 med 18 anställda. Hemsidan presenterar sju tjänster på egna sidor, visar utförda uppdrag med egna bilder från arbetsplatserna och förklarar steg för steg hur ett markprojekt går till, från kostnadsfritt hembesök till fast offert."},
]

SIMPLE_PAGES = {
    "byggda-hemsidor": {
        "title": "Hemsidor vi byggt", "seo_title": "Hemsidor vi byggt – riktiga kunder, riktiga sajter",
        "lead": "Dator och mobil, samma sajt. Klicka på ett kort så öppnas hemsidan här på sidan, i dator- eller mobilvy.",
        "description": "Se hemsidor som Elevate Studio har byggt åt riktiga företag: byggfirma, städfirma och markentreprenad. Besök sajterna och se hur de fungerar på dator och mobil.",
        "sections": [
            ("sites", SITES),
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
                      ("Ingen spårning", "Webbplatsen sätter inga cookies och använder inga analys- eller annonsverktyg. Vi följer inte vad du gör här."),
                      ("Dina rättigheter", "Du har rätt att få veta vilka uppgifter vi har om dig, och att få dem rättade eller raderade. Mejla info@elevatestudio.nu så hjälper vi dig. Du kan också vända dig till Integritetsskyddsmyndigheten (IMY).")]),
            ("links", [("Om cookies", "cookies.html"), ("Kontakta oss", "kontakt.html")]),
        ],
    },
    "cookies": {
        "title": "Om cookies", "seo_title": "Om cookies på elevatestudio.nu", "lead": "Vi använder inga cookies.",
        "description": "Elevate Studios webbplats sätter inga cookies och använder inga analys- eller annonsverktyg.",
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
