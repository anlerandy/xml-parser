import * as XML from './mini_xml_get';
import fs from 'fs';

// read file
const xmlFile = fs
  .readFileSync(__dirname + '/test.xml', 'utf8')
  .replace(/\t/gi, '')
  .replace(/\n/gi, '');

const elements = XML.parse(xmlFile);
console.log(JSON.stringify(elements, null, 4));
const fromObject = XML.fromObject(elements);
console.log(JSON.stringify(fromObject, null, 4));
