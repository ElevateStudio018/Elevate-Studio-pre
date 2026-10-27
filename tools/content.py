"""Page content for elevatestudio.nu. The example projects under Projekt are fictional and marked as such."""

# Google PageSpeed Insights API key for the "Testa din sajt" tool.
# Free to create in Google Cloud Console (APIs & Services → enable "PageSpeed Insights API" → Credentials → API key).
# Restrict the key to your domain (HTTP referrers). Without a key the shared public quota is often exhausted.
PSI_API_KEY = ""

# The live address of the site, used for canonical links, sitemap and structured data.
SITE_URL = "https://elevatestudio.nu"

# Google Analytics 4 measurement ID (looks like "G-XXXXXXXXXX"). Empty = no analytics and no cookie banner.
# Analytics only loads after the visitor accepts statistics cookies.
GA_MEASUREMENT_ID = ""

# Every form posts here. FormSubmit forwards the message to info@elevatestudio.nu.
# The first message triggers a one-time activation mail to info@elevatestudio.nu that must be confirmed.
FORM_ENDPOINT = "https://formsubmit.co/ajax/info@elevatestudio.nu"

SERVICES = [
    {
        "slug": "hemsidor", "name": "Hemsidor", "short": "Hemsidor",
        "card": "Snabba, mobilanpassade hemsidor byggda för att ge förfrågningar.",
        "lead": "Snabba, mobilanpassade hemsidor som visar vad ni gör och gör det enkelt för kunderna att höra av sig.",
        "intro": "En hemsida ska inte bara se bra ut – den ska ge er nya kunder. Vi bygger sidor med tydliga tjänstesidor, en väg till kontakt på varje sida och en struktur som Google förstår. Ni får ett fast pris innan vi börjar och sidan är klar på ungefär en månad.",
        "includes": [
            ("Design efter er verksamhet", "En design som passar ert företag och era kunder – inte en mall som ser ut som alla andras."),
            ("Mobilanpassning", "De flesta besökare kommer från telefonen. Sidan fungerar lika bra på mobil som på dator."),
            ("Tjänstesidor", "En egen sida för varje tjänst gör det lättare för både kunder och Google att hitta rätt."),
            ("Kontakt på varje sida", "Telefon, mejl och formulär är alltid ett klick bort."),
        ],
        "image": "home/svc-hemsidor.jpg", "alt": "Skisser och laptop på ett skrivbord under arbetet med en hemsida",
    },
    {
        "slug": "ai-chatt", "name": "AI-chatt", "short": "AI-chatt",
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
        "slug": "bokning-och-offert", "name": "Bokning och offert", "short": "Bokning",
        "card": "Låt kunderna boka tid eller begära offert direkt på sidan.",
        "lead": "Bokning och offertförfrågningar direkt på hemsidan – med notiser till er via e-post och SMS.",
        "intro": "Varje gång en kund måste ringa eller mejla fram och tillbaka finns en risk att de ger upp. Med bokning eller ett offertflöde på sidan kan kunden göra klart på en gång, och ni får allt ni behöver för att svara.",
        "includes": [
            ("Offertflöde", "Kunden beskriver jobbet steg för steg och ni får en komplett förfrågan."),
            ("Bokning", "Kunden väljer en tid som passar direkt på sidan."),
            ("Notiser via e-post och SMS", "Ni får besked direkt när en ny förfrågan eller bokning kommer in."),
            ("Status och historik", "Håll koll på alla förfrågningar och vad som hänt med dem."),
        ],
        "image": "home/svc-bokning.jpg", "alt": "Person som arbetar vid ett skrivbord med laptop",
    },
    {
        "slug": "seo-och-ai-optimering", "name": "SEO och AI-optimering", "short": "SEO",
        "card": "Syns på Google och när kunder frågar AI-assistenter.",
        "lead": "Sökmotoroptimering och AI-optimering så att kunderna hittar er – på Google och när de frågar en AI.",
        "intro": "Det spelar ingen roll hur bra hemsidan är om ingen hittar den. Vi bygger sidan så att Google och AI-tjänster förstår vad ni gör, var ni finns och vilka frågor ni kan svara på. Grundläggande SEO och AI-optimering ingår i alla hemsidor vi bygger.",
        "includes": [
            ("Teknisk grund", "Snabba sidor, rätt rubriker, beskrivningar och strukturerad data som sökmotorer läser."),
            ("Lokala sökningar", "Tydlig information om var ni finns och vilka orter ni jobbar i."),
            ("AI-optimering", "Innehåll och struktur som gör det lätt för AI-tjänster att beskriva er rätt."),
            ("Vanliga frågor", "Svar på det kunderna faktiskt söker efter, direkt på sidan."),
        ],
        "image": "home/svc-seo.jpg", "alt": "Team med laptops runt ett bord, sett ovanifrån",
    },
    {
        "slug": "support-och-underhall", "name": "Support och underhåll", "short": "Support",
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
        "lead": "En insamlingsorganisation som vi har förvaltat i många år.",
        "challenge": "Givarna ville känna sig trygga med att pengarna gör nytta, och organisationen ville öka andelen månadsgivare.",
        "solution": "Vi förenklade givarflödet, lyfte fram konkreta resultat och byggde kampanjsidor som marknadsteamet kan skapa själva.",
        "result": "Fler månadsgivare och kampanjer som lanseras på dagar i stället för veckor.",
    },
]

ARTICLES = [
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
            ("p", "Hos oss får du ett fast pris i en offert innan vi börjar. Startpaketet kostar 3 000 kr och därefter 99 kr per år, och under första året ingår upp till 10 timmars support och ändringar per månad. Domänen är alltid din. På vår prissida ser du vad som ingår i varje paket, och du kan ladda ner ett exempel på hur vårt avtal ser ut."),
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
            ("p", "Bilder på riktiga jobb, recensioner från kunder och namnen på de som jobbar hos er bygger förtroende snabbare än allmänna löften."),
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
                 "Den gröna och beige färgskalan styrs av ett fåtal CSS-variabler, så hela sajten kunde byta färg genom att ändra dem.",
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
        "here": ["Megamenyn, hamburgermenyn och processflikarna styrs av några få rader JavaScript.",
                 "Siffrorna som räknas upp och korten som tonar in använder IntersectionObserver.",
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
                 "Menyer, flikar och formulär klickades igenom automatiskt för att hitta fel."],
    },
]

TEAM = [
                ("Carl From", "Försäljning & kundkontakt", "+46 76 022 83 61", "carl@elevatestudio.nu"),
                ("Isak Mattsson", "Försäljning & AI-utveckling", "+46 70 289 58 75", "isak@elevatestudio.nu"),
                ("Oscar Svanerud", "Försäljning & affärsutveckling", "+46 76 849 86 68", "svanerudo@gmail.com"),
            ]

SIMPLE_PAGES = {
    "kontakt": {
        "title": "Kontakt", "lead": "Funderar du på en ny hemsida eller vill du förbättra den du har? Ring eller mejla någon av oss direkt – eller skriv några rader i formuläret.",
        "description": "Kontakta Elevate Studio i Uppsala. Ring eller mejla Carl, Isak eller Oscar, eller skriv till info@elevatestudio.nu.",
        "sections": [
            ("team", TEAM),
            ("contact", None),
            ("form", None),
        ],
    },
    "om": {
        "title": "Om oss", "lead": "Elevate Studio är tre personer i Uppsala som bygger hemsidor som ger förfrågningar – för företag i hela Sverige.",
        "description": "Elevate Studio är en webbyrå i Uppsala. Tre personer som bygger hemsidor med bokning, offertflöde och AI-chatt till fast pris.",
        "sections": [
            ("text", "Vi startade Elevate Studio för att det ska vara enkelt för företag att få en hemsida som faktiskt ger kunder. Ni får ett fast pris innan vi börjar, en hemsida på ungefär en månad och samma kontaktperson hela vägen – från första mötet till uppföljningen varje månad."),
            ("cols", [("Fast pris", "Ni vet vad det kostar innan vi börjar. Allt står i en tydlig offert."),
                      ("Samma kontaktperson", "Inga mellanhänder. Ni pratar med någon som kan ert företag."),
                      ("Ni äger er domän", "Domänen är och förblir er – oavsett vad som händer.")]),
            ("team", TEAM),
            ("links", [("Se våra priser", "priser.html"), ("Se ett exempel på avtal", "avtal.html"), ("Kontakta oss", "kontakt.html")]),
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
        "description": "Så hanterar Elevate Studio personuppgifter från kontaktformulär, nyhetsbrev och webbstatistik.",
        "sections": [
            ("cols", [("När du kontaktar oss", "Det du skriver i våra formulär – namn, e-post, telefon, organisation och meddelande – skickas till info@elevatestudio.nu via tjänsten FormSubmit. Vi använder uppgifterna bara för att svara dig och sparar dem inte längre än vi behöver."),
                      ("Webbstatistik", "Om du godkänner statistikcookies använder vi Google Analytics för att se hur webbplatsen används, till exempel vilka sidor som besöks. Uppgifterna används inte för annonsering. Utan ditt godkännande laddas inget analysverktyg."),
                      ("Dina rättigheter", "Du har rätt att få veta vilka uppgifter vi har om dig, få dem rättade eller raderade. Mejla info@elevatestudio.nu så hjälper vi dig. Du kan också vända dig till Integritetsskyddsmyndigheten (IMY).")]),
            ("links", [("Om cookies", "cookies.html"), ("Kontakta oss", "kontakt.html")]),
        ],
    },
    "cookies": {
        "title": "Om cookies", "lead": "Vi använder bara statistikcookies om du godkänner det.",
        "description": "Elevate Studio använder statistikcookies från Google Analytics endast efter ditt godkännande.",
        "sections": [
            ("cols", [("Nödvändigt", "Ditt val i cookierutan sparas i webbläsarens lokala lagring, så att rutan inte visas igen. Det används inte till något annat."),
                      ("Statistik", "Om du godkänner sätter Google Analytics cookies (till exempel _ga) som hjälper oss förstå hur webbplatsen används. Avböjer du laddas inget analysverktyg."),
                      ("Ändra ditt val", '<button type="button" class="arrow-link js-cookie-settings">Visa cookierutan igen</button>')]),
        ],
    },
}
