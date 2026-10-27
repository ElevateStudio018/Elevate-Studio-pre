"""Page content for the design study. All copy is original; clients and projects are fictional."""

# Google PageSpeed Insights API key for the "Testa din sajt" tool.
# Free to create in Google Cloud Console (APIs & Services → enable "PageSpeed Insights API" → Credentials → API key).
# Restrict the key to your domain (HTTP referrers). Without a key the shared public quota is often exhausted.
PSI_API_KEY = ""

SERVICES = [
    {
        "slug": "strategi", "name": "Affärsutveckling och strategi", "short": "Strategi",
        "lead": "Tillsammans tar vi fram en färdplan för era digitala kanaler och följer upp att den levererar.",
        "intro": "Innan något ritas eller byggs behöver alla vara överens om varför. Vi hjälper ledning, marknad och IT att enas om mål, prioriteringar och hur framgång ska mätas – och gör planen så konkret att den går att börja arbeta efter dagen efter.",
        "includes": [
            ("Nulägesanalys", "Vi går igenom era kanaler, data, system och arbetssätt och sammanfattar vad som fungerar och vad som håller er tillbaka."),
            ("Mål och mätetal", "Affärsmål översätts till mätbara digitala mål, med tydliga nyckeltal och en enkel rapportering."),
            ("Färdplan", "En prioriterad plan för de kommande 12–24 månaderna, uppdelad i etapper med budget och ansvar."),
            ("Workshops", "Korta, fokuserade träffar där rätt personer fattar beslut tillsammans i stället för att skicka dokument fram och tillbaka."),
        ],
        "image": "home/step-1.jpg", "cases": ["fjallvagen-bildelar", "hallmark-industri"],
    },
    {
        "slug": "design", "name": "Design", "short": "Design",
        "lead": "Vi formger tjänster och gränssnitt utifrån verkliga behov, så att varje kontakt med ert varumärke känns genomtänkt och lätt.",
        "intro": "Bra design märks mest när den saknas. Vi kombinerar research, interaktionsdesign och visuell identitet för att ta fram gränssnitt som är tydliga, tillgängliga och som känns som just ert varumärke.",
        "includes": [
            ("Användarresearch", "Intervjuer, enkäter och analys av beteendedata som visar vad användarna faktiskt försöker göra."),
            ("Prototyper", "Klickbara prototyper som testas med riktiga användare innan något byggs på riktigt."),
            ("Designsystem", "Komponenter, färger och typografi samlade i ett system som gör det lätt att bygga vidare konsekvent."),
            ("Varumärke", "Logotyp, tonalitet och visuell identitet som håller i både digitala och fysiska kanaler."),
        ],
        "image": "home/pair-4.jpg", "cases": ["nattbryggan", "bergsalen"],
    },
    {
        "slug": "utveckling", "name": "Utveckling", "short": "Utveckling",
        "lead": "Sajter, appar och integrationer byggda för att hålla. Vi väljer tekniken efter uppdraget, inte tvärtom.",
        "intro": "Vi bygger snabba, säkra och lättskötta webbplatser och system. Koden ska vara lika enkel att förstå om tre år som i dag, och tekniken ska passa er organisation – inte bara det som råkar vara populärt just nu.",
        "includes": [
            ("Webbplatser", "Responsiva sajter med fokus på prestanda, tillgänglighet och ett publiceringsverktyg som redaktörerna trivs med."),
            ("Webbappar", "Interaktiva tjänster och kundportaler byggda med moderna ramverk."),
            ("Integrationer", "Kopplingar mot affärssystem, CRM, betalning och andra tjänster ni redan använder."),
            ("Kvalitetssäkring", "Automatiska tester, kodgranskning och visuella jämförelser vid varje ändring."),
        ],
        "image": "home/pair-1.jpg", "cases": ["ljusars-filmdagar", "fjallvagen-bildelar"],
    },
    {
        "slug": "digital-tillvaxt", "name": "Digital tillväxt", "short": "Tillväxt",
        "lead": "Sök, annonsering och analys som hänger ihop och växer i takt med er verksamhet.",
        "intro": "Trafik är bara värdefull om det är rätt besökare som hittar rätt innehåll. Vi arbetar med sökoptimering, synlighet i AI-assistenter, annonsering och analys som en helhet, och mäter allt mot era affärsmål.",
        "includes": [
            ("Sökoptimering", "Teknisk genomlysning, innehållsstrategi och löpande förbättringar för bättre placeringar."),
            ("AI-sök", "Strukturerat och tydligt innehåll som gör att ert varumärke nämns korrekt i AI-genererade svar."),
            ("Annonsering", "Kampanjer i sök och sociala kanaler som optimeras mot faktiska konverteringar."),
            ("Analys", "Mätplan, dashboards och regelbundna genomgångar som leder till konkreta beslut."),
        ],
        "image": "home/pair-2.jpg", "cases": ["insjons-insamlingsfond", "fjallvagen-bildelar"],
    },
    {
        "slug": "drift-och-support", "name": "Drift och support", "short": "Drift",
        "lead": "Vi tar hand om uppdateringar, säkerhet och små förbättringar löpande så att ni kan fokusera på kärnaffären.",
        "intro": "En webbplats är aldrig färdig. Med ett förvaltningsavtal får ni ett team som håller koll på säkerhet, prestanda och uppdateringar, svarar snabbt när något händer och hjälper er att prioritera nästa förbättring.",
        "includes": [
            ("Hosting", "Stabil och övervakad drift med säkerhetskopior och tydliga rutiner för återställning."),
            ("Uppdateringar", "Plattform, tillägg och beroenden hålls uppdaterade och testas innan de släpps."),
            ("Support", "En namngiven kontaktperson och snabba svar när något behöver lösas."),
            ("Vidareutveckling", "En löpande backlog där vi tillsammans prioriterar förbättringar varje månad."),
        ],
        "image": "home/pair-3.jpg", "cases": ["insjons-insamlingsfond", "hallmark-industri"],
    },
    {
        "slug": "inkludering", "name": "Inkludering", "short": "Inkludering",
        "lead": "Digitala tjänster som fungerar för alla. Vi granskar, åtgärdar och utbildar enligt gällande riktlinjer och lagkrav.",
        "intro": "Tillgänglighet handlar om att alla ska kunna använda era tjänster – med skärmläsare, tangentbord, förstoring eller bara en dålig uppkoppling. Det är dessutom ett lagkrav för allt fler organisationer. Vi hjälper er hela vägen från granskning till åtgärd.",
        "includes": [
            ("Granskning", "Manuell och automatisk granskning mot WCAG med en prioriterad lista över åtgärder."),
            ("Åtgärder", "Vi rättar kod, design och innehåll – eller hjälper era egna utvecklare att göra det."),
            ("Utbildning", "Praktiska utbildningar för redaktörer, designers och utvecklare."),
            ("Tillgänglighetsredogörelse", "Hjälp att ta fram och hålla redogörelsen aktuell."),
        ],
        "image": "home/post-1.jpg", "cases": ["nattbryggan", "bergsalen"],
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
        "services": ["utveckling", "digital-tillvaxt"],
    },
    {
        "slug": "bergsalen", "name": "Bergsalen", "tags": ["Sök", "Webb"],
        "image": "home/case-2.jpg", "w": 534, "h": 342,
        "lead": "En kulturhistorisk förening som ville göra sitt arkiv tillgängligt för fler.",
        "challenge": "Föreningens samlingar fanns digitaliserade men var gömda bakom en föråldrad sökfunktion som bara forskare orkade använda.",
        "solution": "Vi tog fram en ny struktur där samlingarna går att utforska via teman, platser och tidsperioder, med en sökning som förstår stavfel och gamla ortnamn.",
        "result": "Besökarna stannar längre och arkivet används nu även av skolor och släktforskare.",
        "services": ["design", "inkludering"],
    },
    {
        "slug": "nattbryggan", "name": "Nattbryggan", "tags": ["App", "Webb"],
        "image": "home/case-3.svg", "w": 534, "h": 342,
        "lead": "En app och en webb som gör det enkelt och tryggt att söka stöd, när som helst på dygnet.",
        "challenge": "En ideell stödlinje behövde nå unga som inte ringer, men som gärna skriver. Tjänsten måste vara diskret, trygg och fungera på alla telefoner.",
        "solution": "Vi designade en chattbaserad tjänst med snabb utloggning, ingen sparad historik på enheten och ett lugnt, inkluderande bildspråk.",
        "result": "Fler tar kontakt via chatt, och volontärerna kan hjälpa fler samtidigt.",
        "services": ["design", "inkludering"],
    },
    {
        "slug": "ljusars-filmdagar", "name": "Ljusårs Filmdagar", "tags": ["Intranät", "Sök", "Webb"],
        "image": "home/case-4.jpg", "w": 746, "h": 480,
        "lead": "En filmfestival som behövde samla biljetter, program och nyheter på ett ställe.",
        "challenge": "Under festivalveckan ökar trafiken tiofalt. Den gamla sajten gick ner varje år när biljettsläppet startade.",
        "solution": "Vi byggde en statiskt genererad sajt med cachning i flera lager och ett separat, skalbart flöde för biljetter. Ett intranät hjälper personalen att hålla programmet uppdaterat.",
        "result": "Sajten klarade festivalens toppar utan avbrott och programmet uppdateras nu i realtid.",
        "services": ["utveckling", "drift-och-support"],
    },
    {
        "slug": "hallmark-industri", "name": "Hallmark Industri", "tags": ["Intranät", "Webb"],
        "image": "home/case-5.jpg", "w": 746, "h": 480,
        "lead": "Intranät och publika sajter för medarbetare och kunder i många länder.",
        "challenge": "Ett internationellt industriföretag hade ett tiotal olika sajter och intranät som inte pratade med varandra.",
        "solution": "Vi samlade allt på en gemensam plattform med ett designsystem, delade komponenter och ett gemensamt flöde för översättningar.",
        "result": "Snabbare publicering, ett enhetligt varumärke och lägre förvaltningskostnad.",
        "services": ["strategi", "utveckling"],
    },
    {
        "slug": "insjons-insamlingsfond", "name": "Insjöns Insamlingsfond", "tags": ["Marknadsföring", "Webb"],
        "image": "home/case-6.jpg", "w": 534, "h": 342,
        "lead": "En insamlingsorganisation som vi har förvaltat i många år.",
        "challenge": "Givarna ville känna sig trygga med att pengarna gör nytta, och organisationen ville öka andelen månadsgivare.",
        "solution": "Vi förenklade givarflödet, lyfte fram konkreta resultat och byggde kampanjsidor som marknadsteamet kan skapa själva.",
        "result": "Fler månadsgivare och kampanjer som lanseras på dagar i stället för veckor.",
        "services": ["digital-tillvaxt", "drift-och-support"],
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

# Technologies actually used to build this study (and that Claude regularly works with).
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
        "here": ["Den här studien behövde inte React – en statisk sajt med lite JavaScript räckte gott.",
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
        "here": ["Alla jämförelser mellan den här studien och förlagan kördes med Node.js-skript.",
                 "Skripten mätte positioner och storlekar på element vid flera skärmbredder."],
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
                 "Pixeljämförelser och kontaktark med bildförslag gjordes med Pillow."],
    },
    {
        "slug": "playwright", "name": "Playwright", "icon": "tech-6.svg",
        "card": "Automatiserade tester i riktiga webbläsare, inklusive visuella jämförelser.",
        "lead": "Ett verktyg för att styra riktiga webbläsare automatiskt – för tester, skärmdumpar och kvalitetskontroll.",
        "intro": "Med Playwright klickar, skriver och scrollar vi oss igenom tjänster precis som en användare – fast tusentals gånger och på flera webbläsare. Det fångar fel innan de når produktion.",
        "uses": [("Flödestester", "Viktiga flöden som köp, inloggning och formulär testas vid varje ändring."),
                 ("Visuell regression", "Skärmdumpar jämförs pixel för pixel för att upptäcka oavsiktliga ändringar."),
                 ("Flera enheter", "Samma tester körs i olika skärmstorlekar och webbläsare.")],
        "here": ["Varje sektion i studien fotograferades vid 1440, 1024, 768 och 390 pixlars bredd.",
                 "Avvikelser mot förlagan mättes i pixlar och justerades tills de var så små som möjligt.",
                 "Menyer, flikar och formulär klickades igenom automatiskt för att hitta fel."],
    },
]

SIMPLE_PAGES = {
    "kontakt": {
        "title": "Kontakt", "lead": "Funderar du på ett nytt projekt eller behöver du hjälp med något som redan finns? Hör av dig direkt till någon av oss eller mejla info@elevatestudio.nu.",
        "sections": [
            ("team", [
                ("Carl", "Försäljning & kundkontakt", "+46 76 022 83 61", "carl@elevatestudio.nu"),
                ("Isak Mattsson", "Försäljning & AI-utveckling", "+46 70 289 58 75", "isak@elevatestudio.nu"),
                ("Oscar Svanerud", "Försäljning & affärsutveckling", "+46 76 849 86 68", "svanerudo@gmail.com"),
            ]),
            ("cols", [("Mejla oss", '<a href="mailto:info@elevatestudio.nu">info@elevatestudio.nu</a><br>Vi svarar normalt inom en arbetsdag.'),
                      ("Besök oss", "Vi finns i Uppsala och arbetar med kunder i hela landet."),
                      ("Följ oss", '<a href="https://elevatestudio.nu">elevatestudio.nu</a><br>Det snabbaste sättet att nå oss är via mejl eller telefon.')]),
            ("form", None),
        ],
    },
    "om": {
        "title": "Om studion", "lead": "Vi tror på små, erfarna team som följer kunden hela vägen – från första idé till tjänsten som utvecklas år efter år.",
        "sections": [
            ("text", "Elevate Studio är en digital studio i Uppsala. Vi arbetar med korta beslutsvägar, öppenhet om vad saker kostar och ett starkt fokus på det som faktiskt ger effekt för våra kunder."),
            ("cols", [("Långa samarbeten", "Vi lär känna era mål, era användare och er organisation, och kan därför ge råd som håller."),
                      ("Kvalitet", "Kodgranskning, automatiska tester och tillgänglighet finns med från början."),
                      ("Ansvar", "Vi väljer leverantörer och arbetssätt som minskar miljöpåverkan.")]),
            ("links", [("Karriär", "karriar.html"), ("Arbetsvillkor", "arbetsvillkor.html"), ("Ansvar", "ansvar.html")]),
        ],
    },
    "karriar": {
        "title": "Karriär", "lead": "Vi letar alltid efter nyfikna människor som gillar att bygga saker ordentligt.",
        "sections": [
            ("text", "Hos oss jobbar du i små team nära kunden, med stort eget ansvar och kollegor som gärna delar med sig. Vi har flexibla arbetstider och sätter kompetensutveckling i kalendern, inte bara i policyn."),
            ("links", [("Se öppna roller", "oppna-roller.html"), ("Läs om våra arbetsvillkor", "arbetsvillkor.html")]),
        ],
    },
    "oppna-roller": {
        "title": "Öppna roller", "lead": "Just nu söker vi inga nya kollegor – det här är en designstudie. Men så här skulle en annons kunna se ut.",
        "sections": [
            ("cols", [("Frontendutvecklare", "Du gillar semantisk HTML, välorganiserad CSS och tillgängliga gränssnitt. Uppsala eller distans."),
                      ("UX-designer", "Du leder research och prototyparbete och trivs i nära samarbete med utvecklare."),
                      ("Projektledare", "Du håller ihop leveranser och är kundens trygga kontakt genom hela projektet.")]),
            ("links", [("Kontakta oss", "kontakt.html")]),
        ],
    },
    "arbetsvillkor": {
        "title": "Arbetsvillkor", "lead": "Bra arbetsvillkor är en förutsättning för bra arbete.",
        "sections": [
            ("text", "Här skulle en riktig studio beskriva kollektivavtal, pension, föräldraledighet, friskvård och arbetstider. Eftersom det här är en designstudie finns det inga faktiska villkor att redovisa."),
        ],
    },
    "ansvar": {
        "title": "Ansvar", "lead": "Hur vi tar ansvar för miljö, människor och informationssäkerhet.",
        "sections": [
            ("cols", [("Miljö", "Lätta sidor drar mindre energi. Vi optimerar bilder, kod och hosting med det i åtanke."),
                      ("Människor", "Tillgängliga tjänster gör att fler kan delta. Det är en självklar del av vårt arbete."),
                      ("Säkerhet", "Vi arbetar strukturerat med informationssäkerhet i både utveckling och drift.")]),
        ],
    },
    "english": {
        "title": "In English", "lead": "Elevate Studio is a digital studio in Uppsala, Sweden.",
        "sections": [
            ("text", "We help companies with strategy, design, development and digital growth. Get in touch at info@elevatestudio.nu. The projects shown on this site are examples."),
            ("links", [("Back to the start page", "index.html")]),
        ],
    },
    "integritet": {
        "title": "Integritetspolicy", "lead": "Den här designstudien samlar inte in några personuppgifter.",
        "sections": [
            ("text", "Formulären på sajten skickar ingenting vidare. Det enda som sparas är ditt val i cookie-dialogen, och det sparas lokalt i din egen webbläsare. Inga analysverktyg eller spårare laddas."),
        ],
    },
    "cookies": {
        "title": "Om cookies", "lead": "Vi använder inga cookies för spårning eller analys.",
        "sections": [
            ("text", "Ditt val i cookie-dialogen sparas i webbläsarens lokala lagring så att dialogen inte visas igen. Vill du se dialogen igen kan du rensa webbplatsdata för den här sidan i webbläsarens inställningar."),
        ],
    },
    "visselblasning": {
        "title": "Visselblåsning", "lead": "Så skulle en riktig organisation ta emot rapporter om missförhållanden.",
        "sections": [
            ("text", "En riktig visselblåsarfunktion ska vara säker, anonym och oberoende. Eftersom det här är en designstudie finns ingen sådan kanal – sidan visar bara var informationen skulle finnas."),
        ],
    },
    "guide": {
        "title": "Guiden: Nästa steg", "lead": "En praktisk handbok för dig som leder marknad, varumärke eller produkt och vill fatta bättre beslut om nästa digitala satsning.",
        "sections": [
            ("cols", [("1. Börja i affären", "Formulera vilket affärsproblem satsningen ska lösa innan ni pratar teknik eller design."),
                      ("2. Mät det som spelar roll", "Välj några få nyckeltal som går att påverka och följ upp dem varje månad."),
                      ("3. Bygg i etapper", "Släpp något litet tidigt, lär av användarna och bygg vidare på det som fungerar.")]),
            ("links", [("Prata med oss om nästa steg", "kontakt.html")]),
        ],
    },
    "ai-sok": {
        "title": "Sökbarhet i AI-assistenter", "lead": "Allt fler köpare börjar sin research i en chatt. Vi ser till att ditt varumärke dyker upp i svaren och att informationen stämmer.",
        "sections": [
            ("text", "Vi kartlägger hur ert varumärke beskrivs i de vanligaste AI-assistenterna i dag, hittar luckor och felaktigheter och tar fram innehåll som gör det lätt att beskriva er rätt."),
            ("links", [("Läs artikeln om AI-sök", "insikter/synas-nar-kunder-fragar-ai.html"), ("Digital tillväxt", "tjanster/digital-tillvaxt.html")]),
        ],
    },
}
