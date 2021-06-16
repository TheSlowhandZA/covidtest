import Handlebars from 'handlebars';
import QrScanner from 'qr-scanner';
const dcc = require('@pathcheck/dcc-sdk');
const iso = require('iso-3166-1');

// Let's import all the references needed
const targetAgent = require('/valuesets/disease-agent-targeted.json');
const vaccineProphylaxis = require('/valuesets/vaccine-prophylaxis.json');
const vaccineProduct = require('/valuesets/vaccine-medicinal-product.json');
const vaccineManf = require('/valuesets/vaccine-mah-manf.json');
const testType = require('/valuesets/test-type.json');
const testResult = require('/valuesets/test-result.json');

// Tests results manufacturers are available online,
// but we need an offline fallback
fetch('https://covid-19-diagnostics.jrc.ec.europa.eu/devices/hsc-common-recognition-rat').then(response => {
    response.json().then(json => {
        const testManf = json;
    })
}).catch(() => {
    const testManf = require('/valuesets/hsc-common-recognition-rat.json');
});

const sampleOrigin = {
    "258500001": "Nasopharyngeal swab",
    "461911000124106": "Oropharyngeal swab",
    "472881004": "Pharyngeal swab",
    "472901003": "Swab from nasal sinus",
    "119342007": "Saliva specimen",
    "119297000": "Blood specimen",
    "119361006": "Plasma specimen",
    "119364003": "Serum specimen",
    "122592007": "Acellular blood (serum or plasma) specimen"
};

let template = require('./template.json');

window.addEventListener('load', function() {

    QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";
    //QrScanner.hasCamera().then(function() {
    const flashlight_btn = document.getElementsByClassName('button')[0];
    // on localise l'element video qui va servir à donner le feedback client
    const video = document.getElementById('scanner');

    QrScanner.hasCamera().then(hasCamera => {
        if (!hasCamera) {
            window.alert("You need a camera to use this tool");
        }
    })
    // on créé un element de scanner
    const scanner = new QrScanner(video, result => decode(result));

    function decode(data) {
        // destroy the scanner, we gonna need memory
        scanner.destroy();
        // Add it as a QRcode in the template
        template.barcode.message = data;

        dcc.debug(data).then(obj => {
            let certificate = obj.value[2].get(-260).get(1);
            template.generic.secondaryFields[0].value = certificate.nam.gn;
            template.generic.secondaryFields[1].value = certificate.nam.fn;
            template.generic.secondaryFields[2].value = certificate.dob;
            if (certificate.v) {
                // COVID-19 Vaccine Certificate
                template.generic.secondaryFields[4].value = certificate.v[0].ci;
                template.generic.backFields[1].value = "COVID-19";
                template.generic.backFields[2].value = "";
                template.generic.backFields[3].value = "";
                template.generic.backFields[4].value = "";
                template.generic.backFields[5].value = "";
                template.generic.backFields[6].value = "";
                iso.whereAlpha2(certificate.v[0].co).country.toUpperCase();
                template.generic.backFields[7] = certificate.v[0].is;
            } else if (certificate.t) {
                // COVID-19 Test Certificate
            } else if (certificate.r) {
                // COVID-19 Recovery Certificate
            }
            console.log('passbook template filled %o', template);
        })
    }

    // on démarre le scan
    scanner.start().then(() => {
        scanner.hasFlash().then(hasFlash => {
            if (hasFlash) {
                flashlight_btn.classList.remove('disabled')
                flashlight_btn.addEventListener('clic', () => {
                    scanner.toggleFlash();
                })
            }
        });
    })

    // }).catch(function() {
    // })
}, false)
