// Dati estratti via OCR da mytour.png — itinerario «My OHN Tour», Open House Napoli 2026 (2-4 ottobre).
// VERIFICA OCR COMPLETATA: tutti i 30 punti confermati dall'utente in pagina (export del pannello Verifica).
// Ordine alfabetico come nella lista originale. Le coordinate sono pre-calcolate con Nominatim
// (vedi _strumenti/geocode.py): la mappa non dipende dal geocoding al volo.
//
// needsReview (rimossi a verifica conclusa): orari, coordinate e titoli controllati e confermati.
export const luoghi = [
  {
    id: "01-accadia-relais",
    title: "ACCADIA RELAIS",
    address: "Piazza Museo Filangieri, 255",
    when: "Sabato 3 ottobre 10:00 > 18:00 | Domenica 4 ottobre 10:00 > 18:00",
    image: "assets/01-accadia-relais.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=505",
    lat: 40.84892, lon: 14.26102,
  },
  {
    id: "02-santa-maria-soccorso",
    title: "ARCICONFRATERNITA E CHIESA DI SANTA MARIA DEL SOCCORSO",
    address: "Piazzetta Giacinto Gigante, 38",
    when: "Sabato 3 ottobre 09:30 > 12:15",
    image: "assets/02-santa-maria-soccorso.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=515",
    lat: 40.85317, lon: 14.23105,
  },
  {
    id: "03-atelier-ambra-caminito",
    title: "ATELIER AMBRA CAMINITO - PALAZZO MANNAJUOLO",
    address: "Via Gaetano Filangieri, 48",
    when: "Sabato 3 ottobre 10:00 > 14:00",
    image: "assets/03-atelier-ambra-caminito.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=430",
    lat: 40.83586, lon: 14.24130,
  },
  {
    id: "04-basilica-spirito-santo",
    title: "BASILICA DELLO SPIRITO SANTO",
    address: "Via Toledo, 402",
    when: "Sabato 3 ottobre 10:00 > 13:00",
    image: "assets/04-basilica-spirito-santo.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=499",
    lat: 40.84688, lon: 14.24855,
  },
  {
    id: "05-cantiere-ex-mercato-ittico",
    title: "CANTIERE EX MERCATO ITTICO",
    address: "Piazza Duca degli Abruzzi",
    when: "Venerdì 2 ottobre 10:00 > 13:00",
    image: "assets/05-cantiere-ex-mercato-ittico.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=408",
    lat: 40.84570, lon: 14.27659,
  },
  {
    id: "06-casa-aura",
    title: "CASA AURA",
    address: "Via Domenico Cimarosa, 65",
    when: "Sabato 3 ottobre 16:00 > 19:00",
    image: "assets/06-casa-aura.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=356",
    lat: 40.84253, lon: 14.23128,
  },
  {
    id: "07-casa-bianca",
    title: "CASA BIANCA - STUDIO PICA CIAMARRA ASSOCIATI",
    address: "Via Francesco Petrarca, 38",
    when: "Sabato 3 ottobre 10:00 > 14:00",
    image: "assets/07-casa-bianca.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=83",
    lat: 40.81542, lon: 14.20734,
  },
  {
    id: "08-casa-bosco",
    title: "CASA BOSCO",
    address: "Via Sant'Antonio a Capodimonte, 10",
    when: "Sabato 3 ottobre 16:00 > 19:00 | Domenica 4 ottobre 10:00 > 13:00",
    image: "assets/08-casa-bosco.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=481",
    lat: 40.86571, lon: 14.25289,
  },
  {
    id: "09-casa-mdm23",
    title: "CASA MDM.23",
    address: "Via Ferri Vecchi, 18",
    when: "Domenica 4 ottobre 14:00 > 18:00",
    image: "assets/09-casa-mdm23.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=484",
    lat: 40.84871, lon: 14.26014,
  },
  {
    id: "10-casa-studio-ambrosino",
    title: "CASA STUDIO DANILO AMBROSINO",
    address: "c/o Palazzo dei Principi Albertini di Cimitile, Via Santa Teresa degli Scalzi, 76",
    when: "Sabato 3 ottobre 10:00 > 18:00 | Domenica 4 ottobre 10:00 > 18:00",
    image: "assets/10-casa-studio-ambrosino.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=494",
    lat: 40.85610, lon: 14.24839,
  },
  {
    id: "11-san-gennaro-olmo-biagio",
    title: "COMPLESSO MONUMENTALE DI SAN GENNARO ALL'OLMO E SAN BIAGIO MAGGIORE",
    address: "via San Gregorio Armeno, 35",
    when: "Sabato 3 ottobre 10:30 > 13:30 | Domenica 4 ottobre 10:30 > 13:30",
    image: "assets/11-san-gennaro-olmo-biagio.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=414",
    lat: 40.85041, lon: 14.25762,
  },
  {
    id: "12-consiglio-metropolitano",
    title: "CONSIGLIO METROPOLITANO E PINACOTECA A SANTA MARIA LA NOVA",
    address: "Piazza Santa Maria la Nova, 43",
    when: "Venerdì 2 ottobre 15:30 > 18:30",
    image: "assets/12-consiglio-metropolitano.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=501",
    lat: 40.84407, lon: 14.25284,
  },
  {
    id: "13-dafna-design",
    title: "DAFNA - DESIGN DIGITALE",
    address: "Via Sant'Anna dei Lombardi, 16",
    when: "Venerdì 2 ottobre 18:00 > 21:00 | Sabato 3 ottobre 10:00 > 18:00",
    image: "assets/13-dafna-design.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=529",
    lat: 40.84641, lon: 14.25023,
  },
  {
    id: "14-educandato-statale",
    title: "EDUCANDATO STATALE",
    address: "Largo dei Miracoli, 37",
    when: "Sabato 3 ottobre 09:30 > 10:50",
    image: "assets/14-educandato-statale.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=309",
    // «Largo dei Miracoli» non mappato su OSM: coordinate della chiesa del monastero dei Miracoli (confermate)
    lat: 40.85883, lon: 14.25612,
  },
  {
    id: "15-hub-degas",
    title: "HUB DEGAS - CASA DELLE ARTI NAPOLI",
    address: "Calata Trinità Maggiore 53, Napoli",
    when: "Sabato 3 ottobre 11:00 > 18:00 | Domenica 4 ottobre 11:00 > 18:00",
    image: "assets/15-hub-degas.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=476",
    lat: 40.84659, lon: 14.25128,
  },
  {
    id: "16-i-non-luoghi-porto",
    title: "I (NON) LUOGHI DEL PORTO DI NAPOLI",
    address: "Imbocco sottopasso metro Municipio, Via Depretis",
    when: "Sabato 3 ottobre 11:30 > 13:00",
    image: "assets/16-i-non-luoghi-porto.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=205",
    // segnalatore a fine via De Gasperi, incrocio con Piazza Municipio (posizione indicata dall'utente)
    lat: 40.84100, lon: 14.25415,
  },
  {
    id: "17-i-condomini-posillipo",
    title: "I CONDOMINI DI STEFANIA FILO SPEZIALE A POSILLIPO",
    address: "Via Petrarca 141",
    when: "Sabato 3 ottobre 15:30 > 16:30 | Domenica 4 ottobre 12:00 > 13:00",
    image: "assets/17-i-condomini-posillipo.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=315",
    lat: 40.80729, lon: 14.19489,
  },
  {
    id: "18-interno6-carla-celestino",
    title: "INTERNO 6 / CARLA CELESTINO",
    address: "Via Gaetano Filangieri, 72",
    when: "Sabato 3 ottobre 10:00 > 13:30 | 16:30 > 19:00",
    image: "assets/18-interno6-carla-celestino.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=169",
    lat: 40.83586, lon: 14.24130,
  },
  {
    id: "19-istituto-pontano",
    title: "ISTITUTO PONTANO",
    address: "Corso Vittorio Emanuele, 581",
    when: "Sabato 3 ottobre 10:00 > 11:00 | 11:30 > 12:30",
    image: "assets/19-istituto-pontano.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=424",
    lat: 40.84015, lon: 14.24387,
  },
  {
    id: "20-architettura-donne",
    title: "L'ARCHITETTURA DELLE DONNE A NAPOLI",
    address: "Obelisco di Portosalvo – Via Alcide de Gasperi, 65",
    when: "Sabato 3 ottobre 16:00 > 17:30 | Domenica 4 ottobre 12:00 > 13:30",
    image: "assets/20-architettura-donne.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=495",
    lat: 40.84174, lon: 14.25554,
  },
  {
    id: "21-liberty-al-vomero",
    title: "LIBERTY AL VOMERO",
    address: "Piazza Vanvitelli",
    when: "Domenica 4 ottobre 10:30 > 12:00",
    image: "assets/21-liberty-al-vomero.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=98",
    lat: 40.84378, lon: 14.23160,
  },
  {
    id: "22-liceo-vittorio-emanuele",
    title: "LICEO VITTORIO EMANUELE II - GARIBALDI",
    address: "Via S. Sebastiano, 51",
    when: "Sabato 3 ottobre 12:00 > 16:30",
    image: "assets/22-liceo-vittorio-emanuele.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=498",
    lat: 40.84837, lon: 14.25209,
  },
  {
    id: "23-mea-domus-mergellina",
    title: "MEA DOMUS MERGELLINA",
    address: "via Giordano Bruno, 95",
    // prenotazione confermata: solo domenica alle 11 (gli altri orari sono stati rimossi)
    when: "Domenica 4 ottobre 11:00 > 11:45",
    image: "assets/23-mea-domus-mergellina.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=503",
    lat: 40.83073, lon: 14.22169,
  },
  {
    id: "24-necropoli-neapolis",
    title: "NECROPOLI ELLENISTICA DI NEAPOLIS: TRACCE D'IDENTITÀ",
    address: "Via Santa Maria Antesaecula, 129",
    when: "Domenica 4 ottobre 10:00 > 11:30 | 12:00 > 13:30",
    image: "assets/24-necropoli-neapolis.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=349",
    lat: 40.85960, lon: 14.25189,
  },
  {
    id: "25-odeon-neapolis",
    title: "ODEON NEAPOLIS",
    address: "Via San Paolo, 51",
    when: "Sabato 3 ottobre 10:00 > 13:00 | 15:00 > 18:00 | Domenica 4 ottobre 10:00 > 13:00 | 15:00 > 18:00",
    image: "assets/25-odeon-neapolis.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=513",
    lat: 40.85159, lon: 14.25605,
  },
  {
    id: "26-ospedale-ravaschieri",
    title: "OSPEDALE STORICO LINA RAVASCHIERI",
    address: "Via Teresa Ravaschieri, 9",
    when: "Sabato 3 ottobre 10:00 > 14:00 | Domenica 4 ottobre 10:00 > 14:00",
    image: "assets/26-ospedale-ravaschieri.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=520",
    lat: 40.83461, lon: 14.22828,
  },
  {
    id: "27-palazzo-sanfelice",
    title: "PALAZZO SANFELICE",
    address: "Via della Sanità, 2/6",
    when: "Sabato 3 ottobre 15:30 > 17:00 | Domenica 4 ottobre 15:30 > 17:00",
    image: "assets/27-palazzo-sanfelice.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=168",
    lat: 40.85747, lon: 14.25239,
  },
  {
    id: "28-santa-lucia-borgo",
    title: "SANTA LUCIA, IL BORGO CHE HA PERSO IL MARE",
    address: "Piazza Trieste e Trento",
    when: "Sabato 3 ottobre 16:00 > 17:30",
    image: "assets/28-santa-lucia-borgo.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=493",
    lat: 40.83732, lon: 14.24845,
  },
  {
    id: "29-teatro-anticaglia",
    title: "TEATRO ANTICO DI NEAPOLIS ALL'ANTICAGLIA",
    address: "Via San Paolo, 4",
    when: "Sabato 3 ottobre 10:00 > 13:00 | 15:00 > 18:00 | Domenica 4 ottobre 10:00 > 13:00 | 15:00 > 18:00",
    image: "assets/29-teatro-anticaglia.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=524",
    lat: 40.85159, lon: 14.25605,
  },
  {
    id: "30-uffici-nlg",
    title: "UFFICI NLG - NAVIGAZIONE LIBERA DEL GOLFO",
    address: "Via Guglielmo Melisurgo, 4",
    when: "Domenica 4 ottobre 10:00 > 14:00",
    image: "assets/30-uffici-nlg.jpg",
    
    url: "https://www.openhousenapoli.org/location/location.php?l=485",
    lat: 40.84006, lon: 14.25525,
  },
];
