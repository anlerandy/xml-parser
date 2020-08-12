const baliseContent = (balise, content, attributes = []) =>
  `<${balise}${attributes.join(' ')}>${`${content}`.replace(/\n/gi, '\n\t')}</${balise}>`;

const head = '<?xml version="1.0" encoding="UTF-8"?>';

const generateAttr = obj => {
  return [];
};

const generateXML = obj => {
  const keys = Object.keys(obj);
  const lines = keys.map(key => {
    const value = obj[key];
    if (!value) return baliseContent(key, '');
    if (Array.isArray(value)) return baliseContent(key, value.map(generateXML).join(''));
    if (typeof value === 'string' || typeof value === 'number') return baliseContent(key, value);
    if (typeof value === 'object' && !Array.isArray(value))
      return baliseContent(key, generateXML(value));
    return baliseContent(key, '');
  });
  return lines.join('');
};

const fromObject = object => {
  const set = generateXML(object);
  const xml = head + '\n' + set;
  return xml;
};

const getTargetElements = (xml, name) => {
  const rex = new RegExp(`<${name}(\\b.*?>|>)(.*?)</${name}>`, 'gm');
  const elements = xml.match(rex);
  return elements || [];
};

const getXmlElementsByName = (xml, name) => {
  if (!xml || !name) return [];
  const elements = getTargetElements(xml, name);
  const purifiedElems = elements.map(elem =>
    elem.replace(new RegExp(`<${name}(\\b.*?>|>)(.*?)`), '').replace(`</${name}>`, '')
  );
  return purifiedElems || [];
};

const getXmlElementByName = (xml, name) => getXmlElementsByName(xml, name)[0];

const objifyElementsByNames = (xml, names = []) => {
  const purifiedElems = names.reduce(
    (acc, name) => ({ ...acc, [`${name}`]: getXmlElementsByName(xml, name) }),
    {}
  );
  const witness = [...Array(purifiedElems[names[0]].length)];
  const objifiedElems = witness.reduce((acc, _, index) => {
    const obj = names.reduce((acc, key) => ({ ...acc, [key]: purifiedElems[key][index] }), {});
    return [...acc, obj];
  }, []);
  return objifiedElems;
};

const cleanedObjifyElementsByNames = (xml, names = []) => objifyElementsByNames(xml, names)[0];

const getXmlSectionsByNames = (xml, names = []) =>
  names.reduce((_, name) => _ && getXmlElementsByName(_, name)[0], xml);

const getXmlSectionByNames = (xml, names = []) => getXmlSectionsByNames(xml, names)[0];

const objifyAttr = (attributes, obj = {}) => {
  if (!attributes) return obj;
  const rex = /(.*?)="(.*?)"/gim;
  const res = rex.exec(attributes);
  const [fetched, key, value] = res || [];
  const rest = attributes.replace(fetched, '');
  if (!rest) return { ...obj, [key.trim()]: value };
  return objifyAttr(rest, { ...obj, [key.trim()]: value });
};

const getXmlAttributesByName = (xml, name) => {
  const strings = getTargetElements(xml, name);
  const rex = new RegExp(`<${name}(.*?)>`);
  const exec = string => {
    const res = rex.exec(string);
    if (!Array.isArray(res) && !res.length) return '';
    const attributes = res[1];
    const ObjifiedAttr = objifyAttr(attributes);
    return ObjifiedAttr;
  };
  const result = strings.map(exec);
  return result;
};

const getXmlAttributeByName = (xml, name) => getXmlAttributesByName(xml, name)[0];

const getElements = xml => {
  if (!xml) return undefined;
  const rex = /<(?<name>.*?)(\s.*?>|>)(.*?)<\/(.*?)>/g;
  const res = rex.exec(xml);
  if (!res || !res.length || !res['groups'] || !res['groups'].name) return xml;
  const { name } = res['groups'];
  const elements = getXmlElementsByName(xml, name);
  const attributes = getXmlAttributeByName(xml, name);
  const newXml = xml.replace(new RegExp(`<${name}(\\b.*?>|>)(.*?)</${name}>`, 'gi'), '');
  let newElem = getElements(newXml);
  if (typeof newElem !== 'object') newElem = { trash: newElem };
  if (Object.keys(attributes || {}).length)
    if (elements.length > 1) {
      return {
        [name]: elements.map(getElements),
        [`${name}_attr`]: attributes,
        ...newElem
      };
    } else
      return {
        [name]: getElements(elements[0]),
        [`${name}_attr`]: attributes,
        ...newElem
      };
  else if (elements.length > 1) {
    return { [name]: elements.map(getElements), ...newElem };
  } else return { [name]: getElements(elements[0]), ...newElem };
};

const parse = xml => {
  xml = xml.replace(/\<\?xml(.*?)\?\>/gim, '');
  const elements = getElements(xml);
  return elements;
};

// export default parse;
const XML = {
  getXmlElementsByName,
  getXmlElementByName,
  objifyElementsByNames,
  cleanedObjifyElementsByNames,
  getXmlSectionsByNames,
  getXmlSectionByNames,
  getXmlAttributesByName,
  getXmlAttributeByName,
  parse,
  fromObject
};

module.exports = XML;
