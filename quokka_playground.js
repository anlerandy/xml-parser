import * as XML from './mini_xml_get';
import fs from 'fs';

// read file
const xmlFile = fs
  .readFileSync(__dirname + '/test.xml', 'utf8')
  .replace(/\t/gi, '')
  .replace(/\n/gi, '');

// const PDRs = XML.getXmlElementsByName(xmlFile, 'order');

const neededElements = [
  'adresse1',
  'adresse2',
  'adresse3',
  'codePostal',
  'localite',
  'nom',
  'langue',
  'libellePays'
];

// const formatedPDRs = PDRs.map(order => XML.cleanedObjifyElementsByNames(PDR, neededElements));
// console.log(JSON.stringify(formatedPDRs, null, 4));
// const attributes = XML.getXmlAttributesByName(xmlFile, 'return');
// console.log(JSON.stringify(attributes, null, 4));

const elements = XML.parse(xmlFile);
console.log(JSON.stringify(elements, null, 4));
const fromObject = XML.fromObject(elements);
console.log(JSON.stringify(fromObject, null, 4));
