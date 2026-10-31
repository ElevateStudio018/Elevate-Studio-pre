# Generates the extra landing pages (30 pages: 18 trades, 7 towns, 5 topics) for LANDINGS in content.py.
# Facts used: Starter 3 000 kr + 99-199 kr/year, Pro 6 000 kr + 299-399 kr/year, Elite by quote, all excl. VAT;
# first draft after about a day; two proof-reading rounds; up to 10 support hours a month the first year
# (Starter); based in Uppsala, meetings in person or online. Nothing else is promised.
from landings_branscher import BRANSCHER as _B1
from landings_branscher2 import BRANSCHER2
from landings_mass import parse_jobs, CITIES, town_page2
BRANSCHER = _B1 + BRANSCHER2 + parse_jobs()

PRICE = ("Hos oss kostar en Starter-hemsida 3 000 kr i startavgift plus 99–199 kr om året. Pro, där hemsidan också tar emot offertförfrågningar, bokningar och frågor åt er, kostar 6 000 kr plus 299–399 kr om året. "
         "Större projekt med egna system får ett fast pris i en offert innan vi börjar. Alla priser anges exklusive moms.")


def process(i):
    v = [
        ["Första mötet: vi går igenom vad ni gör, vilka ni vill nå och vilka frågor kunderna brukar ställa.", "Utkast på ungefär en dag: ni får se en riktig hemsida och inte bara en skiss.", "Två korrekturvändor: ni ändrar text, bilder och detaljer tills det känns rätt.", "Lansering: hemsidan går live och Google får veta att den finns."],
        ["Vi börjar med ett kort samtal om verksamheten, tjänsterna och målgruppen.", "Därefter bygger vi ett första utkast, oftast klart på ungefär en dag.", "Ni får granska och komma med ändringar i två omgångar.", "När ni är nöjda publicerar vi sidan och ser till att den kan hittas."],
        ["Steg ett är ett möte där vi lär känna er och er målgrupp.", "Steg två är ett utkast som ni kan klicka runt i, ofta redan nästa dag.", "Steg tre är två rundor av ändringar enligt era önskemål.", "Steg fyra är lansering, och därefter finns vi kvar för support."],
    ][i % 3]
    return ("Så går det till", ["¶ Ni pratar med samma person från första mötet till lansering. Det är en liten webbyrå där ingen behöver förklara sin verksamhet två gånger.", *v])


def price_sec(who, i):
    lead = ["Vad kostar det?", "Priser och upplägg", "Så mycket kostar det"][i % 3]
    return (lead, [f"¶ {PRICE}", f"¶ För {who} räcker oftast Starter om ni vill ha en tydlig företagspresentation, och Pro om hemsidan också ska ta emot förfrågningar eller bokningar. Vi hjälper er att välja rätt nivå på första mötet, och ni vet alltid kostnaden innan vi sätter igång.", "¶ I Starter ingår upp till 10 timmars support och redigering per månad under det första året. Se hela avtalet på sidan Exempel på webbavtal."])


def seo_sec(topic, kw):
    return (f"Så syns ni på Google", [f"¶ Att bygga en snygg hemsida räcker inte. Den måste också kunna hittas. Därför ingår grundläggande SEO och AI-optimering i alla våra hemsidor, med bland annat rätt rubriker, beskrivande sidtitlar, snabb laddning, mobilanpassning och strukturerad data som hjälper Google och AI-assistenter att förstå vad ni gör.", f"¶ För {topic} bygger vi sidorna kring de sökningar kunderna faktiskt gör. Det är till exempel:", *kw, "¶ Vi kan inte lova en viss placering. Ingen seriös byrå kan det. Det vi kan lova är att grunden är rätt gjord, att sidan är snabb och att innehållet svarar på det folk frågar. Hur ni syns kan ni sedan följa i vårt gratis test, Testa din sajt, och i Google Search Console."])


FAQ_SHARED = [
    ("Hur snabbt kan en hemsida bli klar?", "Ett första utkast brukar vara klart på ungefär en dag. Hur snabbt hela sidan blir klar beror främst på hur snabbt ni hinner ge oss text, bilder och ändringar."),
    ("Behöver vi kunna något tekniskt?", "Nej. Vi tar hand om allt det tekniska, som domän, hosting och mejl. Ni bidrar med kunskap om ert företag, och vi gör resten."),
]


def branch_page(b, idx, others):
    n, f, pl = b["noun"], b["firm"], b["plural"]
    sections = [
        (f"Så söker kunderna efter {pl}", [f"¶ {b['intro']}", f"¶ Det som kunderna skriver i Google är ofta enkla, konkreta sökningar. Några exempel för er bransch:", *b["searches"], f"¶ En hemsida som svarar på de frågorna, med rätt rubriker och en egen sida per tjänst, har mycket större chans att dyka upp än en som bara har en startsida."]),
        (f"Det här ska en hemsida för {n} innehålla", ["¶ Det här är den grundläggande listan vi utgår från, och som vi sedan anpassar efter just er verksamhet:", *b["needs"]]),
        ("Det som får kunden att höra av sig", [f"¶ {b['trust']}"]),
        ("Vanliga misstag på hemsidor i branschen", ["¶ Vi ser ofta samma problem när vi tittar på hemsidor för företag i er bransch:", *b["mistakes"], "¶ Allt det går att undvika om hemsidan byggs utifrån vad kunden vill veta, och inte utifrån vad företaget vill säga."]),
        ("Funktioner som sparar tid för er", [f"¶ {b['tool']}", "¶ Allt detta är funktioner vi bygger in i Pro-paketet: offertflöde, bokning, AI-chatt och notiser via e-post och SMS. Ni får status och historik på alla förfrågningar, så ingenting försvinner."]),
        seo_sec(f"{pl}", b["searches"][:4]),
        process(idx),
        price_sec(pl, idx),
    ]
    faq = list(b["faq"]) + FAQ_SHARED
    return dict(slug=b["slug"], title=f"Hemsida för {n} – fast pris från 3 000 kr", h1=f"Hemsida för <em>{b['em']}</em>",
                description=f"Hemsida för {n} med offertformulär, bokning och SEO. Fast pris från 3 000 kr, utkast på ungefär en dag. Webbyrå i Uppsala.",
                lead=f"Vi bygger snabba, mobilanpassade hemsidor för {pl} som får kunder att höra av sig, till fast pris och med samma kontaktperson hela vägen.",
                sections=sections, faq=faq, kind="bransch", label=f"Hemsida för {n}", short=b["intro"].split(". ")[0] + ".", related=others)


# ---- Towns ----
ORTER = [
    dict(slug="webbyra-knivsta", name="Knivsta", km="ungefär 20 km", area="Knivsta kommun", sub="Knivsta, Alsike och Vassunda",
         feel="Knivsta ligger bara en kort bit söder om Uppsala och är en av de kommuner som växer snabbast i regionen, med många småföretag, hantverkare och egenföretagare. Många av dem jobbar mot kunder i både Uppsala och Stockholm.",
         faq=[("Kan ni komma till Knivsta?", "Ja. Knivsta är nära Uppsala, så vi kan träffas på plats, hos er eller på ett kafé. Möten går också bra på distans."), ("Hur syns ett företag i Knivsta på Google?", "Genom en hemsida med sidor som nämner både tjänst och ort, en komplett Google-företagsprofil och en snabb, mobilanpassad sida.")]),
    dict(slug="webbyra-enkoping", name="Enköping", km="ungefär 65 km", area="Enköpings kommun", sub="Enköping, Grillby och Fjärdhundra",
         feel="Enköping är en stad med ett brett näringsliv: hantverkare, handel, tjänsteföretag och lantbruksnära verksamheter. Många av kunderna söker lokalt först, vilket gör en tydlig lokal hemsida extra värdefull.",
         faq=[("Jobbar ni med företag i Enköping?", "Ja. Vi bygger hemsidor för företag i hela Sverige, och de flesta möten sker på distans. Vi kommer gärna till Enköping för ett första möte."), ("Vad kostar en hemsida för ett företag i Enköping?", "Samma som överallt: Starter från 3 000 kr och Pro från 6 000 kr i startavgift, exklusive moms. Läget påverkar inte priset.")]),
    dict(slug="webbyra-marsta", name="Märsta", km="ungefär 40 km", area="Sigtuna kommun", sub="Märsta, Sigtuna och Rosersberg",
         feel="Märsta och Sigtuna ligger vid Arlanda och Mälaren, med både logistik, hantverk, handel och turism. Företag här når kunder från Stockholm och Uppsala, och en hemsida som är snabb och lätt att hitta är en tydlig fördel.",
         faq=[("Bygger ni hemsidor för företag i Märsta och Sigtuna?", "Ja. Vi finns i Uppsala, ungefär en halvtimme härifrån, och möter gärna kunder på plats. Annars fungerar distansmöten lika bra."), ("Kan ni göra hemsidor på flera språk?", "Vi har byggt språkomkoppling för svenska och engelska på vår egen sajt. Behöver ni fler språk, berätta det på första mötet så lägger vi det i offerten.")]),
    dict(slug="webbyra-vasteras", name="Västerås", km="ungefär 85 km", area="Västerås stad", sub="Västerås, Hallstahammar och Köping",
         feel="Västerås är en större stad med många företag i alla storlekar, från industri och teknik till hantverkare och konsulter. Konkurrensen om uppmärksamheten är stor, och en hemsida som är snabb och tydlig är ofta det som avgör vem som får samtalet.",
         faq=[("Kan ni bygga hemsida åt ett företag i Västerås?", "Ja, helt på distans eller med ett första möte på plats. Vi bygger för företag över hela landet."), ("Hur lång tid tar det?", "Ett första utkast brukar vara klart på ungefär en dag. Sedan går ni igenom två rundor av ändringar innan lansering.")]),
    dict(slug="webbyra-orebro", name="Örebro", km="ungefär 190 km", area="Örebro kommun", sub="Örebro, Kumla och Lindesberg",
         feel="Örebro är ett stort handels- och logistikcentrum med många företag som söker kunder över hela Mellansverige. Vi sitter i Uppsala, men arbetar helt på distans med kunder i hela landet, och det fungerar enkelt: möten på video, utkast på skärmen och ändringar via mejl.",
         faq=[("Är det ett problem att ni sitter i Uppsala?", "Nej. Alla steg går att göra på distans: möte på video, granskning av utkast online och support via mejl eller telefon."), ("Kan vi träffas personligen?", "Ja, om det passar. De flesta kunder utanför Uppsala väljer distansmöten, men vi kan ordna ett möte på plats om ni vill.")]),
    dict(slug="webbyra-gavle", name="Gävle", km="ungefär 95 km", area="Gävle kommun", sub="Gävle, Sandviken och Hofors",
         feel="Gävle har ett varierat näringsliv med både industri, handel, hantverk och tjänsteföretag. Många av dem verkar i både stadens och omlandets marknad, och kunderna söker ofta lokalt, vilket gör att en hemsida som nämner orten och tjänsten blir extra användbar.",
         faq=[("Jobbar ni med företag i Gävle?", "Ja, helt på distans. Vi bygger hemsidor för företag i hela Sverige och är tillgängliga på telefon, mejl och video."), ("Kan ni fixa vår gamla hemsida i stället för att göra en ny?", "Det går, men ofta är det snabbare och billigare att bygga en ny från grunden. Berätta vad ni har, så säger vi vad vi rekommenderar.")]),
    dict(slug="webbyra-goteborg", name="Göteborg", km="ungefär 45 mil", area="Göteborgs stad", sub="Göteborg, Mölndal och Partille",
         feel="Göteborg är Sveriges andra största stad med tusentals företag, från små hantverksfirmor till stora koncerner. Konkurrensen i sökresultaten är hård, och en snabb, välbyggd hemsida med rätt innehåll gör stor skillnad. Vi bygger för företag i hela landet och jobbar helt på distans med kunder i Göteborg.",
         faq=[("Kan en webbyrå i Uppsala bygga hemsida åt ett företag i Göteborg?", "Ja. Hela arbetet går att göra på distans, från första mötet till lansering. Vi har byggt hemsidor åt kunder i andra delar av landet, och det fungerar utan problem."), ("Hur lokalt kan ni optimera för Göteborg?", "Vi bygger sidor som nämner både tjänst och ort, ger dem rätt rubriker och kopplar dem till er Google-företagsprofil. Det hjälper er att synas på sökningar som kommer från just Göteborg.")]),
]

ORTER += [
    dict(slug="webbyra-norrtalje", name="Norrtälje", km="ungefär 85 km", area="Norrtälje kommun", sub="Norrtälje, Rimbo och Hallstavik",
         feel="Norrtälje med omnejd har ett företagsliv som sträcker sig från hantverkare och handel till besöksnäring i skärgården. Många av kunderna söker lokalt, och för säsongsbetonade verksamheter är en hemsida som är klar i tid extra viktig.",
         faq=[("Kan ni bygga hemsida åt ett företag i Norrtälje?", "Ja. Vi bygger för hela landet och möter gärna på plats eller på distans."), ("Kan ni göra en säsongsanpassad hemsida?", "Ja. Hemsidan kan uppdateras med öppettider, erbjudanden och bilder inför varje säsong.")]),
    dict(slug="webbyra-sodertalje", name="Södertälje", km="ungefär 110 km", area="Södertälje kommun", sub="Södertälje, Nykvarn och Salem",
         feel="Södertälje har ett brett näringsliv med både industri, handel och småföretag. Många verkar i en region där konkurrensen är hård, och en snabb, tydlig hemsida är ett sätt att sticka ut.",
         faq=[("Jobbar ni med företag i Södertälje?", "Ja, helt på distans eller med ett första möte på plats. Vi bygger hemsidor åt företag i hela landet."), ("Hur lång tid tar det att få en hemsida klar?", "Första utkastet är oftast klart på ungefär en dag. Hur lång tid hela sidan tar beror på hur snabbt vi får text och bilder.")]),
    dict(slug="webbyra-tierp", name="Tierp", km="ungefär 50 km", area="Tierps kommun", sub="Tierp, Söderfors och Karlholmsbruk",
         feel="Tierp ligger norr om Uppsala med ett företagsliv som präglas av hantverk, lantbruk, tjänster och mindre industri. Många företagare är ensamma eller har få anställda, och för dem är en hemsida som sköter sig själv värdefull.",
         faq=[("Kan ni komma till Tierp?", "Ja. Tierp ligger inte långt från Uppsala, så vi kan ses på plats. Distansmöten fungerar också bra."), ("Vi är en enmansfirma. Är en hemsida lönsam?", "Ofta ja. De flesta kunder söker upp er på nätet innan de ringer, och en tydlig sida gör att ni inte tappar dem.")]),
    dict(slug="webbyra-osthammar", name="Östhammar", km="ungefär 65 km", area="Östhammars kommun", sub="Östhammar, Öregrund och Gimo",
         feel="Östhammars kommun har en lång kust, en levande besöksnäring och många hantverkare och småföretag. Här bor många deltidsboende och turister som söker lokalt, och en hemsida som visar öppettider, tjänster och hur man bokar gör skillnad under säsong.",
         faq=[("Kan ni bygga hemsida åt ett företag i Östhammar?", "Ja. Vi arbetar med företag i hela landet och möter gärna på plats i Uppsalaregionen."), ("Är det viktigt med öppettider på hemsidan?", "Mycket. Besökare kollar ofta öppettider på mobilen innan de kommer. Vi ser till att de är tydliga och enkla att uppdatera.")]),
    dict(slug="webbyra-heby", name="Heby", km="ungefär 40 km", area="Heby kommun", sub="Heby, Morgongåva och Östervåla",
         feel="Heby kommun ligger nära Uppsala med företag inom lantbruk, hantverk, handel och tjänster. Många av dem når kunder i både Heby, Uppsala och Västerås, och en hemsida som syns på orten och i närliggande städer är en fördel.",
         faq=[("Jobbar ni med företag i Heby?", "Ja. Heby ligger nära Uppsala, så vi kan ses på plats, hos er eller hos oss."), ("Kan ni bygga hemsida åt ett lantbruksföretag?", "Ja. Vi bygger hemsidor för företag i alla branscher, och anpassar innehållet efter er verksamhet.")]),
    dict(slug="webbyra-alvkarleby", name="Älvkarleby", km="ungefär 55 km", area="Älvkarleby kommun", sub="Älvkarleby, Skutskär och Marma",
         feel="Älvkarleby kommun ligger vid Dalälven, med både industri, hantverk, handel och besöksverksamhet. Många företag arbetar mot kunder i Gävle, Uppsala och närområdet, och en tydlig, snabb hemsida hjälper dem att nå rätt kunder.",
         faq=[("Kan ni göra en hemsida åt ett företag i Älvkarleby?", "Ja, med möten på plats eller på distans. Vi bygger för företag i hela Sverige."), ("Vad kostar det?", "Starter kostar 3 000 kr i startavgift, Pro 6 000 kr. Alla priser anges exklusive moms.")]),
    dict(slug="webbyra-sala", name="Sala", km="ungefär 50 km", area="Sala kommun", sub="Sala, Möklinta och Västerfärnebo",
         feel="Sala är en stad med ett varierat företagsliv: hantverk, handel, tjänster och en stark besöksnäring kring silvergruvan. Företag här har ofta kunder både i Sala och i Västerås och Uppsala, och en hemsida som är lätt att hitta på alla orter är värdefull.",
         faq=[("Jobbar ni med företag i Sala?", "Ja. Vi finns i Uppsala och möter gärna på plats i Sala eller på distans."), ("Kan ni hjälpa ett turistföretag?", "Ja. Vi bygger sidor med öppettider, bokning och information som passar besöksnäringen.")]),
    dict(slug="webbyra-linkoping", name="Linköping", km="ungefär 28 mil", area="Linköpings kommun", sub="Linköping, Mjölby och Åtvidaberg",
         feel="Linköping är en stor stad med universitet, teknik- och tjänsteföretag och många småföretag. Konkurrensen om kunder är stor, och en välbyggd, snabb hemsida är ett billigt sätt att höja nivån. Vi sitter i Uppsala och arbetar helt på distans med kunder i hela landet.",
         faq=[("Kan en webbyrå i Uppsala jobba med företag i Linköping?", "Ja. Hela arbetet går att göra på distans, från första mötet till lansering."), ("Hur lokalt kan ni optimera?", "Vi bygger sidor som nämner både tjänst och ort, med rätt rubriker och en komplett Google-företagsprofil.")]),
    dict(slug="webbyra-norrkoping", name="Norrköping", km="ungefär 25 mil", area="Norrköpings kommun", sub="Norrköping, Finspång och Söderköping",
         feel="Norrköping har ett varierat näringsliv med industri, handel, kultur och tjänsteföretag. Många verksamheter söker kunder både lokalt och regionalt, och en hemsida som är snabb och tydlig gör att ni syns på rätt sökningar. Vi arbetar helt på distans med kunder i hela Sverige.",
         faq=[("Är det svårt att jobba på distans?", "Nej. Vi har möte på video, ni granskar utkast online och ändringar tar vi via mejl eller samtal."), ("Kan vi träffas personligen?", "Ja, om det passar. De flesta kunder utanför Uppsala väljer distansmöten.")]),
    dict(slug="webbyra-jonkoping", name="Jönköping", km="ungefär 37 mil", area="Jönköpings kommun", sub="Jönköping, Huskvarna och Nässjö",
         feel="Jönköping är en handels- och logistikstad med många företag av alla storlekar. Läget vid Vättern och de goda kommunikationerna gör att kunder ofta kommer från ett stort område, och en hemsida som svarar på det de söker gör skillnad. Vi bygger för företag i hela landet.",
         faq=[("Bygger ni hemsidor åt företag i Jönköping?", "Ja, på distans. Vi har byggt hemsidor åt kunder i flera delar av landet."), ("Kan ni göra sidor för flera orter?", "Ja. Vi kan bygga sidor som nämner flera orter, vilket hjälper er att synas där era kunder finns.")]),
    dict(slug="webbyra-malmo", name="Malmö", km="ungefär 62 mil", area="Malmö stad", sub="Malmö, Lund och Staffanstorp",
         feel="Malmö är en av landets största städer, med tusentals företag och en tuff konkurrens om uppmärksamheten. En snabb, välbyggd hemsida med tydligt innehåll är ett av de billigaste sätten att skilja sig från mängden. Vi sitter i Uppsala och arbetar helt på distans med kunder i hela landet.",
         faq=[("Kan en webbyrå i Uppsala bygga hemsida åt ett företag i Malmö?", "Ja. Hela arbetet går att göra på distans, och avståndet påverkar inte priset."), ("Vad kostar det?", "Starter från 3 000 kr och Pro från 6 000 kr i startavgift, exklusive moms.")]),
    dict(slug="webbyra-helsingborg", name="Helsingborg", km="ungefär 59 mil", area="Helsingborgs stad", sub="Helsingborg, Ängelholm och Höganäs",
         feel="Helsingborg är en hamn- och handelsstad med många tjänsteföretag, hantverkare och butiker. Kunderna söker ofta lokalt, och för att synas där behöver hemsidan visa tydligt vad ni gör och var ni verkar. Vi bygger för företag i hela landet, helt på distans.",
         faq=[("Jobbar ni med företag i Helsingborg?", "Ja. Vi sitter i Uppsala men bygger hemsidor åt företag i hela landet."), ("Hur lång tid tar det?", "Första utkastet brukar vara klart på ungefär en dag.")]),
]


def town_page(t, others):
    n = t["name"]
    sections = [
        (f"Webbyrå för företag i {n}", [f"¶ {t['feel']}", f"¶ Vi är en liten webbyrå i Uppsala, {t['km']} från {n}, och bygger hemsidor som får kunder att höra av sig. Vi arbetar med företag i {t['area']} och i hela Sverige: {t['sub']} och allt däremellan.", "¶ De flesta av våra möten sker på distans, men om ni vill träffas på plats kommer vi gärna. Ni pratar med samma person från första samtalet till lansering."]),
        ("Det här får ni", ["¶ En hemsida som ska göra ett jobb för er, inte bara se bra ut. Vi bygger efter den här listan:", "Snabb, mobilanpassad design som laddar direkt, även på svag mobiltäckning", "En egen sida för varje tjänst, så att ni syns på sökningar som matchar det ni gör", "Kontaktväg på varje sida: telefon, formulär och, om ni vill, bokning direkt", "Offertflöde som frågar rätt saker, så ni får bra förfrågningar", "AI-chatt som svarar på vanliga frågor medan ni jobbar", "Grundläggande SEO och AI-optimering, så Google och AI-assistenter förstår vad ni gör", "Support och underhåll efter lansering"]),
        (f"Lokal SEO för {n}", [f"¶ När kunder letar efter ett företag nära sig söker de ofta på tjänsten tillsammans med orten, till exempel hemsida {n} eller webbyrå {n}. För att synas där behöver hemsidan visa tydligt vad ni gör och var ni verkar.", "¶ Vi gör det genom att:", f"Skriva sidtitlar och rubriker som nämner både tjänst och {n} där det är relevant", "Lägga in strukturerad data som berättar för Google vilket företag ni är och vilka områden ni täcker", "Hjälpa er att skapa och fylla i en komplett Google-företagsprofil", "Se till att sidan är snabb och fungerar på mobilen, eftersom de flesta lokala sökningar sker där", "¶ Det går inte att lova en viss placering, men grunden blir rätt gjord från start. Efteråt kan ni följa resultatet i Testa din sajt och i Google Search Console."]),
        ("Hur samarbetet fungerar på distans", ["¶ Det är enklare än många tror. Vi ses på video, ni berättar om företaget, och vi bygger ett första utkast som ni kan klicka runt i direkt. Ändringar tar vi i två omgångar via mejl eller samtal.", "¶ Det går också bra att ringa. Vi svarar oftast samma dag, och i Starter ingår upp till 10 timmars support och redigering per månad under det första året."]),
        price_sec(f"företag i {n}", 1),
        ("Vad är det första ni ska göra?", ["¶ Boka ett kort möte, gratis och utan krav. Vi går igenom vad ni vill få ut av hemsidan, tittar på er nuvarande sida om ni har en och säger ärligt vad vi rekommenderar. Ni kan också börja med att testa er nuvarande sajt i Testa din sajt, ett gratis test som visar hastighet, tillgänglighet och SEO."]),
    ]
    return dict(slug=t["slug"], title=f"Webbyrå {n} – hemsidor från 3 000 kr", h1=f"Webbyrå för företag i <em>{n}</em>",
                description=f"Webbyrå för företag i {n}: snabba hemsidor med SEO, bokning och offertflöde till fast pris från 3 000 kr. Arbetar på distans eller på plats.",
                lead=f"Vi bygger hemsidor åt företag i {n} och {t['area']}: snabba, mobilanpassade och med fast pris från 3 000 kr. Ni pratar med samma person hela vägen.",
                sections=sections, faq=list(t["faq"]) + FAQ_SHARED, kind="ort", label=f"Webbyrå {n}", short=f"Hemsidor för företag i {n}, {t['km']} från Uppsala.", related=others, area=n)


# ---- Topic pages ----
TOPICS = [
    dict(slug="seo-byra", title="SEO-byrå – sökmotoroptimering från 3 000 kr", h1="SEO-byrå i <em>Uppsala</em>",
         description="SEO-byrå i Uppsala: sökmotoroptimering som ingår i varje hemsida, från 3 000 kr. Teknisk SEO, innehåll, lokal SEO och AI-optimering utan krångel.",
         lead="Sökmotoroptimering handlar om att göra det lätt för Google, och för kunderna, att förstå vad ni gör. Vi bygger det direkt i hemsidan, så ni slipper betala för det separat.",
         label="SEO-byrå i Uppsala", short="Sökmotoroptimering som ingår i varje hemsida.",
         sections=[
             ("Vad är SEO?", ["¶ SEO, sökmotoroptimering, är allt som gör att en hemsida syns bättre i sökresultaten på Google och andra sökmotorer. Det handlar om tre saker: att sidan är tekniskt i ordning, att innehållet svarar på det folk söker och att andra sajter och tjänster visar att ni är relevanta.", "¶ Bra SEO är inget trick. Det är grundläggande hantverk: rätt rubriker, tydliga texter, en snabb sida och en struktur som en sökmotor kan läsa."]),
             ("Det här gör vi", ["¶ Det här ingår som grund när vi bygger en hemsida, och kan också göras för en befintlig sajt:", "Teknisk SEO: snabb laddning, mobilanpassning, rätt rubrikstruktur, sitemap, canonical-länkar och säkerhetsrubriker", "Sidtitlar och beskrivningar som matchar det kunderna söker på, och som lockar till klick", "Strukturerad data så att Google förstår företaget, tjänsterna och eventuella vanliga frågor", "Bilder i moderna format med beskrivande text, så de laddar snabbt och kan hittas", "Intern länkning så att besökare och sökmotorer hittar mellan sidorna", "Lokal SEO: sidor för orter, kopplad Google-företagsprofil och tydliga kontaktuppgifter", "AI-optimering så att AI-assistenter som ChatGPT och Gemini kan hitta och återge er information"]),
             ("Så mäter vi", ["¶ Vi mäter det som går att mäta. Hastighet, tillgänglighet, bästa praxis och SEO kontrollerar vi med Googles eget testverktyg, och ni kan göra samma test själva i Testa din sajt. Sökord, klick och visningar följer vi i Google Search Console.", "¶ Vi sätter inga luddiga mål. Vi tittar på vilka sökord som ger visningar, vilka sidor som får klick och var det finns luckor att fylla."]),
             ("Hur lång tid tar det?", ["¶ SEO är inte en strömbrytare. Google behöver ofta några veckor för att hitta och bedöma en ny sida, och resultaten växer över månader. Det som går fort är grunden: en korrekt byggd, snabb sida är på plats redan vid lansering.", "¶ Var misstänksam mot den som lovar förstaplats på Google om en vecka. Det finns ingen seriös byrå som kan lova det."]),
             ("Innehåll som drar trafik", ["¶ Bra innehåll är det som skiljer en hemsida som syns från en som inte gör det. Vi skriver sidor och artiklar som svarar på de frågor som era kunder faktiskt ställer. Det ger trafik från Google och visar att ni kan ert område.", "¶ Vi publicerar själva två artiklar i månaden på vår egen sajt, och kan hjälpa er att planera vilka ämnen som passar er bransch."]),
             price_sec("SEO", 2),
         ],
         faq=[("Kan ni göra SEO på en befintlig hemsida?", "Ja, ofta går det, men om sidan är byggd på ett sätt som begränsar den, till exempel är långsam eller svår att ändra, rekommenderar vi ibland att bygga om. Vi säger ärligt vad som lönar sig."), ("Kan ni garantera förstaplats på Google?", "Nej, och ingen seriös byrå kan det. Vi garanterar att grunden är rätt byggd och att sidan är snabb, och vi hjälper er att följa resultatet."), ("Vad är skillnaden mellan SEO och AI-optimering?", "SEO handlar om att synas i sökresultat. AI-optimering handlar om att AI-assistenter ska kunna förstå och återge er information. Mycket överlappar, och båda ingår i våra hemsidor.")]),
    dict(slug="ai-optimering", title="AI-optimering (AIO) – syns i ChatGPT och Gemini", h1="AI-optimering – syns i <em>ChatGPT och Gemini</em>",
         description="AI-optimering (AIO) gör att ChatGPT, Gemini och andra AI-assistenter kan hitta och återge ert företag. Ingår i våra hemsidor från 3 000 kr.",
         lead="Allt fler frågar en AI-assistent i stället för att googla. Vi bygger hemsidor som är lätta för både sökmotorer och AI-assistenter att förstå.",
         label="AI-optimering för företag", short="Så syns ni när kunder frågar en AI.",
         sections=[
             ("Vad är AI-optimering?", ["¶ AI-optimering, ibland kallat AIO, GEO eller AI-synlighet, handlar om att göra det lätt för AI-assistenter som ChatGPT, Gemini, Claude och Perplexity att hitta, förstå och återge information om ert företag.", "¶ När en kund frågar en AI vilka företag som bygger hemsidor i Uppsala, eller vad en hemsida brukar kosta, hämtar assistenten information från sajter på nätet. Det gäller att er sajt går att läsa och tydligt svarar på frågan."]),
             ("Det här gör vi", ["¶ Vi bygger in det här i alla hemsidor:", "Tydliga, korta svar på vanliga frågor, som AI-assistenter lätt kan citera", "Strukturerad data som beskriver företaget, tjänsterna, priserna och er kontaktinformation", "En sida som laddar snabbt och är lätt för robotar att läsa, utan innehåll som är gömt i skript", "Filerna llms.txt och robots.txt, så AI-tjänster vet vad de får läsa och var informationen finns", "Konkreta uppgifter: pris, område, kontaktväg och öppettider, i stället för allmänna formuleringar", "Texter skrivna som svar på frågor, med tydliga rubriker"]),
             ("Varför spelar det roll?", ["¶ Fler söker via AI. Det betyder att en del av kunderna aldrig besöker en sökresultatsida, utan får ett svar direkt. Står ni inte med i svaret, kan kunden aldrig ha hört om er.", "¶ Det bästa är att det mesta som gör en sida bra för AI också är bra för människor: tydliga svar, snabb laddning, ordning och konkret information. Det är inte ett separat projekt, utan en del av att göra hemsidan ordentligt."]),
             ("Vad vi inte kan lova", ["¶ AI-assistenter väljer själva vad de återger, och ingen kan styra det. Vi kan göra era sidor så lätta att läsa och citera som möjligt. Vi kan inte garantera att ni nämns.", "¶ Var försiktig med den som säljer garanterad synlighet i AI. Det är ett område som utvecklas snabbt, och de flesta löften går inte att hålla."]),
             ("Så kommer ni igång", ["¶ AI-optimering ingår i alla våra hemsidor, även Starter. Har ni redan en hemsida kan vi göra en genomgång och föreslå vad som bör ändras. Börja gärna med att testa er sajt i Testa din sajt, som visar SEO, tillgänglighet och mer."]),
             price_sec("AI-optimering", 0),
         ],
         faq=[("Vad är skillnaden mellan SEO och AI-optimering?", "SEO handlar om sökmotorer och sökresultat. AI-optimering handlar om att AI-assistenter ska förstå och återge er information. Det överlappar mycket, och båda ingår hos oss."), ("Kan ni garantera att vi nämns av ChatGPT?", "Nej. AI-assistenter väljer själva vad de återger. Vi gör sidan så tydlig och lättläst som möjligt, men kan inte styra svaren."), ("Behöver vi AI-optimering om vi redan har SEO?", "Ofta räcker grunden långt, men vissa saker är specifika för AI, som llms.txt och korta, tydliga svar. Vi tar hand om båda.")]),
    dict(slug="hemsida-med-bokningssystem", title="Hemsida med bokningssystem – från 6 000 kr", h1="Hemsida med <em>bokningssystem</em>",
         description="Hemsida med bokningssystem där kunder bokar tid direkt, med bekräftelse och kalenderinbjudan. Ingår i Pro från 6 000 kr. Fast pris, byggd av oss.",
         lead="Låt kunderna boka direkt i stället för att ringa. Bokningen sker på hemsidan, och ni får tiden i er kalender.",
         label="Hemsida med bokning", short="Låt kunderna boka tid direkt på hemsidan.",
         sections=[
             ("Därför bokning på hemsidan", ["¶ Många vill inte ringa. De vill se lediga tider, välja en och få en bekräftelse. Särskilt kvällstid, när ni inte svarar i telefon, är bokning på hemsidan skillnaden mellan en kund och ingen alls.", "¶ För er innebär det färre samtal, färre missförstånd och en kalender som fylls på av sig själv."]),
             ("Så fungerar det", ["¶ Så här fungerar bokningssystemet vi bygger:", "Kunden ser lediga tider och väljer en som passar", "Upptagna tider kan hållas borta från bokningen", "Kunden fyller i namn och kontaktuppgifter", "Både kunden och ni får en bekräftelse, med en kalenderinbjudan där det behövs", "Ni får notiser via e-post och SMS", "Bokningar sparas med status och historik"]),
             ("Passar för många branscher", ["¶ Bokning passar alla som säljer tid: frisörer, verkstäder, konsulter, tränare, behandlare, hantverkare som gör platsbesök och rådgivare av olika slag. Vi anpassar tidslängd, öppettider och vilka uppgifter som behövs efter er verksamhet."]),
             ("Kombinera med offertflöde och AI-chatt", ["¶ Bokning blir ännu bättre tillsammans med andra funktioner. Offertformuläret samlar in underlag innan mötet, och en AI-chatt kan svara på frågor och hänvisa vidare till bokning. Allt ingår i Pro-paketet."]),
             ("Exempel på hur bokningen kan se ut", ["¶ Upplägget anpassas efter hur ni arbetar. Några exempel:", "Frisör eller behandlare: kunden väljer behandling, då styr tidslängden vilka tider som visas", "Verkstad: kunden väljer typ av jobb och en tid att lämna in bilen", "Konsult eller rådgivare: korta möten på 30 minuter, med en länk till videomöte i bekräftelsen", "Hantverkare: ett platsbesök, där kunden anger adress och vad jobbet gäller", "Städfirma: bokning av städning eller flyttstädning med datum och bostadsyta", "¶ Gemensamt är att kunden får en bekräftelse direkt och att ni får all information samlad på ett ställe."]),
             ("Det här kan vi inte lova", ["¶ Bokningssystemet är byggt för att boka tid och möten. Det är inget kassasystem och tar inte betalt. Behöver ni det kan vi titta på en lösning inom Elite, med ett fast pris."]),
             price_sec("ett bokningssystem", 1),
         ],
         faq=[("Kan kunden boka utan att ringa?", "Ja. Kunden väljer en ledig tid direkt på hemsidan och får en bekräftelse."), ("Hamnar bokningen i vår kalender?", "Det går att koppla bokningarna till er Google-kalender. Berätta på första mötet hur ni vill ha det, så lägger vi det i offerten."), ("Går det att ta betalt vid bokning?", "Inte i standardlösningen. Behöver ni det kan vi göra ett separat upplägg som en del av Elite.")]),
    dict(slug="offertformular-pa-hemsidan", title="Offertformulär på hemsidan – få bättre förfrågningar", h1="Offertformulär på <em>hemsidan</em>",
         description="Offertformulär som ställer rätt frågor, så ni får bra förfrågningar och kan svara snabbt. Ingår i Pro från 6 000 kr. Fast pris, byggt av en webbyrå i Uppsala.",
         lead="Ett bra offertformulär ger er rätt underlag från första förfrågan, så ni slipper ringa tillbaka tre gånger för att förstå vad kunden vill ha.",
         label="Offertformulär", short="Få rätt underlag redan från första förfrågan.",
         sections=[
             ("Vad ett bra offertformulär gör", ["¶ Ett vanligt kontaktformulär ger er ett namn och ett meddelande. Ett bra offertformulär ställer de frågor ni behöver för att kunna svara: vilken tjänst, var, hur stort, när och med vilket budgetspann.", "¶ Det sparar tid för er och gör att kunden känner att ni förstått behovet innan ni ens har pratat."]),
             ("Så bygger vi det", ["¶ Vi anpassar formuläret efter er bransch. Det kan innehålla:", "Val av tjänst, så att förfrågan hamnar rätt", "Fält för ort, storlek, tidpunkt och andra detaljer som påverkar priset", "Möjlighet att bifoga en bild eller ritning", "Frågor som sorterar bort sådant ni inte vill ha", "Tydlig bekräftelse till kunden och notis till er via e-post och SMS", "Status och historik, så att varje förfrågan går att följa upp"]),
             ("Mindre är ibland mer", ["¶ Ett formulär som är för långt får färre svar. Vi hittar en balans där ni får det ni måste ha, och kunden kan fylla i på en minut även på mobilen. Resten tar ni i ett samtal."]),
             ("Koppla till bokning", ["¶ Ni kan låta kunden boka ett kort möte direkt efter att formuläret skickats. Då går det från första intresse till bokad tid utan väntetid."]),
             ("Exempel på frågor per bransch", ["¶ Frågorna ska passa verksamheten. Några exempel:", "Elektriker: typ av jobb, bostadstyp, ort och en bild på centralen eller uttaget", "Målare: vilka rum eller vilken fasad, ungefärlig yta och önskad tidpunkt", "Flyttfirma: från- och tilladress, våning, hiss, volym och datum", "Snickare: typ av projekt, mått, plats och om det finns ritningar", "Städfirma: tjänst, bostadsyta, antal rum och önskat datum", "¶ Vi sätter ihop frågorna tillsammans med er, så att formuläret ger det ni behöver och inget mer."]),
             ("Spamskydd", ["¶ Formulär drar till sig skräp. Vi bygger in skydd mot automatiska utskick, så att ni inte drunknar i falska förfrågningar."]),
             price_sec("ett offertformulär", 2),
         ],
         faq=[("Vilka frågor ska ett offertformulär ha?", "De som ni behöver för att kunna ge ett pris: tjänst, plats, storlek och tidpunkt. Håll det kort, och ta resten i ett samtal."), ("Kan kunden bifoga bilder?", "Ja. Bilder gör ofta att ni kan ge ett bättre svar utan platsbesök."), ("Får vi veta när en förfrågan kommer in?", "Ja. Ni får notis via e-post och SMS, och förfrågan sparas med status och historik.")]),
    dict(slug="hemsida-for-nystartat-foretag", title="Hemsida för nystartat företag – från 3 000 kr", h1="Hemsida för <em>nystartat företag</em>",
         description="Hemsida för nystartat företag och enskild firma. Fast pris från 3 000 kr, första utkastet på ungefär en dag. Vi tar hand om domän, hosting och SEO.",
         lead="När ni startar företag finns det mycket att tänka på. Hemsidan ska inte bli ännu en sak som tar tid. Vi tar hand om allt det tekniska och ger er en sida som fungerar från dag ett.",
         label="Hemsida för nystartat företag", short="En hemsida som fungerar från dag ett.",
         sections=[
             ("Vad ni behöver från start", ["¶ Ett nytt företag behöver inte en stor hemsida. Det behöver en sida som berättar vad ni gör, för vem och hur man tar kontakt. Allt annat kan komma senare.", "¶ Starter-paketet är gjort för det: en snygg, snabb och mobilanpassad hemsida med presentation, tjänster, kontaktformulär och grundläggande SEO. Fast pris från 3 000 kr."]),
             ("Det här tar vi hand om", ["¶ Ni behöver inte kunna något tekniskt. Vi ordnar:", "Domän, till exempel ert företagsnamn.se", "Hosting och säkerhet, så sidan är snabb och krypterad", "Företagsmejl på er egen domän", "Design och texter som passar er verksamhet", "Grundläggande SEO och AI-optimering", "Support efter lansering, upp till 10 timmar i månaden under första året"]),
             ("Vad ska stå på sidan?", ["¶ Vad ni gör, för vem och varför just ni. Kontaktuppgifter. Några tydliga tjänster. En eller två bilder som visar vem ni är. Det räcker långt, och mycket av det är det kunder söker efter."]),
             ("Domän och e-post", ["¶ En egen domän och en egen e-postadress gör att ni ser seriösa ut. Vi hjälper er att välja namn och ordna det praktiska. Äger ni redan domänen, hjälper vi er att koppla den."]),
             ("Checklista inför lansering", ["¶ Det här är bra att ha på plats när sidan går live:", "Företagsnamn, organisationsnummer och kontaktuppgifter", "En kort text om vad ni gör och för vem", "De tre till fem tjänster ni vill att kunderna ska hitta", "Några bilder, gärna egna i stället för bildbank", "Ett telefonnummer och en e-postadress som ni faktiskt svarar på", "En Google-företagsprofil, så att ni syns på kartan och i lokala sökningar", "¶ Saknar ni något av det, hjälper vi er att komma på det. Första utkastet kan vara klart redan efter en dag, även om vissa bitar fylls på senare."]),
             ("Växa i er egen takt", ["¶ Börja enkelt. När ni har fler kunder, kan hemsidan byggas ut med offertflöde, bokning och AI-chatt i Pro-paketet. Ni behöver inte bygga om, utan lägger till."]),
             price_sec("nystartade företag", 0),
         ],
         faq=[("Behöver jag en hemsida när jag startar företag?", "Det är inget krav, men de flesta kunder letar upp er på nätet innan de hör av sig. En enkel, snabb hemsida gör att ni inte tappar dem."), ("Kan ni hjälpa mig med domän och e-post?", "Ja. Vi ordnar både domänen och e-post med ert företagsnamn."), ("Vad kostar det att komma igång?", "Starter kostar 3 000 kr i startavgift plus 99–199 kr om året, exklusive moms.")]),
]

TOPICS += [
    dict(slug="ai-chatt-pa-hemsidan", title="AI-chatt på hemsidan – svara kunder dygnet runt", h1="AI-chatt på <em>hemsidan</em>",
         description="AI-chatt på hemsidan svarar på vanliga frågor dygnet runt och hänvisar vidare till bokning och offert. Ingår i Pro från 6 000 kr. Byggd av en webbyrå i Uppsala.",
         lead="Kunder frågar när det passar dem, inte när ni har öppet. En AI-chatt på hemsidan svarar på det som ofta frågas och för kunden vidare till kontakt eller bokning.",
         label="AI-chatt på hemsidan", short="Svara på kundernas frågor dygnet runt.",
         sections=[
             ("Vad en AI-chatt gör", ["¶ En AI-chatt är en liten funktion på hemsidan där besökaren kan skriva en fråga och få ett svar direkt. Den är byggd för att svara på det som kunder oftast undrar: vad kostar det, hur lång tid tar det, vilka områden täcker ni, och hur bokar jag.", "¶ Den ersätter inte er. Den tar de vanliga frågorna så att ni kan lägga tiden på det som kräver en människa."]),
             ("Det här kan den hjälpa till med", ["¶ Vi anpassar chatten efter er verksamhet. Typiska användningar är:", "Svara på frågor om tjänster, priser och leveranstid", "Förklara hur ett offertflöde eller en bokning går till", "Hänvisa till rätt sida, formulär eller telefonnummer", "Svara utanför kontorstid, till exempel på kvällar och helger", "Fånga upp frågor som ni inte har svar på, så att ni ser vad kunderna undrar över"]),
             ("Det här ska den inte göra", ["¶ En chatt ska hålla sig till det den vet. Den ska inte hitta på svar, lova priser som inte finns eller ge råd i frågor som kräver en expert, som juridik eller medicin. Vi bygger den så att den hänvisar vidare när den inte vet."]),
             ("Så fungerar det för kunden", ["¶ Besökaren ser en liten knapp på sidan. Där kan de skriva en fråga eller välja bland vanliga frågor. Svaret kommer direkt, och om det behövs får de en länk till bokning eller ett formulär."]),
             ("Så får ni nytta av det", ["¶ Chatten ger er två fördelar. Besökarna får snabbare svar, och ni får en bild av vad kunderna faktiskt undrar över. Frågor som många ställer kan ni svara på redan på hemsidan."]),
             price_sec("en AI-chatt", 1),
         ],
         faq=[("Vad kostar en AI-chatt?", "AI-chatten ingår i Pro-paketet, som kostar 6 000 kr i startavgift plus 299–399 kr om året, exklusive moms."), ("Kan chatten hitta på svar?", "Vi bygger den så att den håller sig till era uppgifter och hänvisar vidare när den inte vet."), ("Ersätter chatten kundtjänst?", "Nej. Den tar de vanliga frågorna, så att ni kan fokusera på det som kräver en människa.")]),
    dict(slug="redesign-av-hemsida", title="Ny hemsida eller redesign – vad ska ni välja?", h1="Redesign av <em>hemsida</em>",
         description="Ny hemsida eller förbättra den gamla? Vi går igenom när redesign lönar sig, vad det kostar och hur det går till. Fast pris från 3 000 kr.",
         lead="Många har en hemsida som fungerar men inte ger några kunder. Ska ni laga den eller bygga en ny? Här går vi igenom hur ni avgör det.",
         label="Redesign av hemsida", short="När lönar det sig att bygga om?",
         sections=[
             ("När är det dags?", ["¶ Det finns några tydliga tecken på att hemsidan behöver göras om:", "Den är långsam, särskilt på mobilen", "Den ser inte ut som er verksamhet gör idag", "Det är svårt att ändra text och bilder", "Besökarna hör inte av sig, trots att de kommer", "Den syns inte på Google, eller syns på fel sökord", "Den är inte mobilanpassad", "¶ Är flera av punkterna sanna är en redesign ofta bättre än att försöka laga."]),
             ("Laga eller bygga nytt?", ["¶ Det går ofta att förbättra en befintlig hemsida, till exempel genom att byta bilder, snabba upp den eller skriva om texter. Men om grunden är gammal, tung eller svår att ändra blir varje förbättring dyr och ger lite.", "¶ Vi tittar på er nuvarande sida, och säger ärligt vad vi rekommenderar. Ofta är det snabbare och billigare att bygga en ny från grunden, till ett fast pris."]),
             ("Det här brukar förbättras", ["¶ När vi bygger om en hemsida förbättras vanligtvis:", "Hastigheten, så besökarna inte lämnar sidan", "Mobilupplevelsen, där de flesta besökarna är", "Innehållet, med tydligare tjänster och svar på kundernas frågor", "Kontaktvägarna, med formulär, bokning eller offert på rätt ställen", "SEO och AI-synlighet, så att ni lättare hittas", "Möjligheten att själv ändra, med support från oss"]),
             ("Så skyddar vi er synlighet", ["¶ Har ni redan en hemsida som syns på Google är det viktigt att inte tappa det vid en ombyggnad. Vi gör omdirigeringar från de gamla adresserna till de nya, behåller sidor som fungerar och kontrollerar resultatet efteråt."]),
             ("Hur lång tid tar det?", ["¶ Ett första utkast brukar vara klart på ungefär en dag. Sedan går vi igenom två rundor av ändringar innan lansering. Hur lång tid det tar totalt beror främst på hur snabbt vi får text och bilder."]),
             price_sec("en redesign", 2),
         ],
         faq=[("Kan ni bygga om vår befintliga hemsida?", "Ja. Vi tittar på er nuvarande sida och bygger en ny, med samma innehåll där det fungerar och bättre där det inte gör det."), ("Förlorar vi vår plats på Google vid en ombyggnad?", "Inte om det görs rätt. Vi omdirigerar de gamla adresserna och kontrollerar resultatet efteråt."), ("Behåller vi vår domän?", "Ja. Vi kopplar den nya hemsidan till er befintliga domän.")]),
    dict(slug="hemsida-for-enskild-firma", title="Hemsida för enskild firma – från 3 000 kr", h1="Hemsida för <em>enskild firma</em>",
         description="Hemsida för enskild firma och egenföretagare: snabb, billig och enkel att komma igång med. Fast pris från 3 000 kr. Vi tar hand om domän och SEO.",
         lead="Som egenföretagare har du inte tid att bli webbutvecklare. Vi bygger en hemsida som fungerar från dag ett, så att du kan fokusera på det du är bra på.",
         label="Hemsida för enskild firma", short="Enkel hemsida för dig som jobbar själv.",
         sections=[
             ("Behöver en enskild firma en hemsida?", ["¶ De flesta kunder söker upp ett företag på nätet innan de hör av sig, även om de blivit rekommenderade. En enkel, tydlig hemsida gör att du ser seriös ut och att kunden kan hitta dina uppgifter direkt.", "¶ Det handlar inte om en stor sida. Det räcker med några tydliga avsnitt: vad du gör, för vem, vad det kostar och hur man når dig."]),
             ("Det här får du", ["¶ Starter-paketet är gjort för egenföretagare:", "En snygg, snabb och mobilanpassad hemsida", "Presentation av dig och dina tjänster", "Kontaktformulär och telefonnummer som syns", "Grundläggande SEO och AI-optimering", "Domän, hosting och säkerhet", "Upp till 10 timmars support och redigering per månad första året"]),
             ("Du behöver inget tekniskt", ["¶ Du behöver inte kunna något om domäner, servrar eller kod. Du berättar om din verksamhet, och vi bygger och sköter resten. När något ska ändras kan du höra av dig."]),
             ("Växa med dina behov", ["¶ När du får fler kunder kan hemsidan byggas ut med offertflöde, bokning och AI-chatt i Pro. Du behöver inte börja om, utan lägger till."]),
             ("Vad behöver du ha redo?", ["¶ Det här är bra att ha:", "Ditt företagsnamn och kontaktuppgifter", "En kort text om vad du gör", "Några bilder, gärna egna", "Dina viktigaste tjänster", "Ett telefonnummer och en e-postadress som du svarar på"]),
             price_sec("enskild firma", 0),
         ],
         faq=[("Vad kostar en hemsida för en enskild firma?", "Starter kostar 3 000 kr i startavgift plus 99–199 kr om året, exklusive moms."), ("Måste jag ha en egen domän?", "Det rekommenderas. Det ser seriösare ut, och vi hjälper dig att välja och koppla den."), ("Kan jag ändra sidan själv?", "Du kan höra av dig så ändrar vi, och i Starter ingår upp till 10 timmars support och redigering per månad första året.")]),
]


def generate():
    out = []
    slugs = [b["slug"] for b in BRANSCHER]
    labels = {b["slug"]: f"Hemsida för {b['noun']}" for b in BRANSCHER}
    for t in ORTER: labels[t["slug"]] = f"Webbyrå {t['name']}"
    for t in TOPICS: labels[t["slug"]] = t["label"]
    labels.update({"webbyra-uppsala": "Webbyrå Uppsala", "webbyra-stockholm": "Webbyrå Stockholm", "hemsida-for-hantverkare": "Hemsida för hantverkare", "billig-hemsida": "Billig hemsida"})
    for c in CITIES:
        cc = c.split("|"); labels[f"webbyra-{cc[0]}"] = f"Webbyrå {cc[1]}"
    topic_slugs = [t["slug"] for t in TOPICS]
    NT = len(topic_slugs)
    for i, b in enumerate(BRANSCHER):
        near = [slugs[(i + k) % len(slugs)] for k in (1, 2, 3)]
        rel = near + [topic_slugs[i % NT], topic_slugs[(i + 2) % NT], "webbyra-uppsala"]
        out.append(branch_page(b, i, [(s, labels[s]) for s in rel]))
    towns = [t["slug"] for t in ORTER]
    for i, t in enumerate(ORTER):
        rel = [towns[(i + k) % len(towns)] for k in (1, 2)] + ["webbyra-uppsala", "webbyra-stockholm", topic_slugs[i % NT], "hemsida-for-hantverkare"]
        out.append(town_page(t, [(s, labels[s]) for s in rel]))
    LAN = {"Knivsta": "Uppsala", "Enköping": "Uppsala", "Märsta": "Stockholm", "Tierp": "Uppsala", "Östhammar": "Uppsala", "Heby": "Uppsala", "Älvkarleby": "Uppsala", "Sala": "Västmanland",
           "Västerås": "Västmanland", "Örebro": "Örebro", "Gävle": "Gävleborg", "Göteborg": "Västra Götaland", "Norrtälje": "Stockholm", "Södertälje": "Stockholm", "Linköping": "Östergötland",
           "Norrköping": "Östergötland", "Jönköping": "Jönköping", "Malmö": "Skåne", "Helsingborg": "Skåne"}
    for d in out:
        if d.get("kind") == "ort" and not d.get("lan"): d["lan"] = LAN.get(d.get("area"), "")
    ctowns = [c.split("|") for c in CITIES]
    for i, c in enumerate(CITIES):
        slug, name, lan = c.split("|")[:3]
        same = [f"webbyra-{x[0]}" for x in ctowns if x[2] == lan and x[0] != slug]
        near = (same + [f"webbyra-{ctowns[(i + k) % len(ctowns)][0]}" for k in (1, 2, 3)])[:3]
        labels[f"webbyra-{slug}"] = f"Webbyrå {name}"
        rel = near + ["webbyra-uppsala", topic_slugs[i % NT], "hemsida-for-hantverkare"]
        out.append(town_page2(c, [(x, labels.get(x, x)) for x in rel], i, price_sec, FAQ_SHARED))
    for d in out:
        for x in d.get("related", []): pass
    for i, t in enumerate(TOPICS):
        rel = [slugs[(i * 3 + k) % len(slugs)] for k in range(3)] + [topic_slugs[(i + 1) % NT], topic_slugs[(i + 2) % NT], "webbyra-uppsala"]
        d = dict(t); d.update(kind="amne", related=[(s, labels[s]) for s in rel], faq=list(t["faq"]) + FAQ_SHARED)
        out.append(d)
    return out
