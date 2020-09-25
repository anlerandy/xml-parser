// PUBLIC LICENSE (pasted from https://github.com/anlerandy/xml-parser)
const baliseContent = (balise, content, attributes = []) =>
  `<${balise}${attributes.join(' ')}>${`${content}`.replace(/\n/gi, '\n\t')}</${balise}>`;

const head = '<?xml version="1.0" encoding="UTF-8"?>';

const generateAttr = (obj) => {
  return [];
};

const generateXML = (obj) => {
  const keys = Object.keys(obj);
  const lines = keys.map((key) => {
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

const fromObject = (object) => {
  const set = generateXML(object);
  const xml = head + '\n' + set;
  return xml;
};

const getTargetElements = (xml, name) => {
  const rex = new RegExp(`<${name}(\\b.*?>|>)(.*?)</${name}>`, 'gm');
  const elements = xml.match(rex);
  if (!elements || !elements.length) {
    const rex = new RegExp(`<${name}(\\b.*?)/>`, 'gm');
    const elements = xml.match(rex);
    return elements || [];
  }
  return elements || [];
};

const getXmlElementsByName = (xml, name) => {
  if (!xml || !name) return [];
  const elements = getTargetElements(xml, name);
  const purifiedElems = elements.map((elem) =>
    elem
      .replace(new RegExp(`<${name}(\\b.*?>|>)(.*?)`), '')
      .replace(`</${name}>`, '')
      .trim()
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
  let rest = attributes.replace(fetched, '');
  if (rest && rest.trim() === '/') rest = '';
  if (!value || !value.trim) return obj;
  if (!rest) return { ...obj, [key.trim()]: value.trim() };
  return objifyAttr(rest, { ...obj, [(key || '').trim()]: (value || '').trim() });
};

const getXmlAttributesByName = (xml, name) => {
  const strings = getTargetElements(xml, name);
  const rex = new RegExp(`<${name}(\\b.*?)>`);
  const exec = (string) => {
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

const bypassErrors = true;

const getElement = (xml) => {
  if (!xml) return { result: undefined };
  let trash = '';

  const rex = /<(?<name>((?<=<).*?(?=(\s.*?|)>))).*?>(.*?)(<\/\k<name>>)/;
  let res = rex.exec(xml.trim());
  const matched = res && res.length && res['groups'] && !!res['groups'].name;
  const index = matched && res.index;

  if (!matched || index !== 0) {
    const rex2 = /<(?<name>.*?)(\s.*?\/>|\/>)/;
    const res2 = rex2.exec(xml.trim());
    const matched2 = res2 && res2.length && res2['groups'] && !!res2['groups'].name;
    const index2 = matched2 && res2.index;
    if (!matched2 || index2 !== 0) {
      if ((matched || matched2) && !bypassErrors) return { error: xml.trim() };
      else if (!matched && !matched2) return { result: xml.trim() };
      else {
        if (matched && matched2) res = index2 < index ? res2 : res;
        else res = matched ? res : res2;
        trash = xml.slice(0, res.index);
      }
    } else res = res2;
  }

  const {
    [0]: captured = '',
    [4]: element = '',
    groups: { name }
  } = res;
  const [cleanName, ..._] = name.split(' ');

  if (
    !captured.startsWith(`<${name}`) ||
    (!captured.endsWith(`</${name}>`) && !captured.endsWith(`/>`))
  ) {
    console.log('Wrong parsing');
    return { error: captured };
  }

  const attributes = getXmlAttributeByName(xml, cleanName);
  const newXml = trash
    ? xml.replace(captured, '').replace(trash, '').trim()
    : xml.replace(captured, '').trim();
  return { name, element: element.trim(), attributes, rest: newXml, trash };
};

const getElements = (xml) => {
  let array = [];
  while (xml) {
    const { rest = '', ...obj } = getElement(xml);
    if (rest && xml === rest) xml = '';
    else xml = rest;
    if (obj.error || (obj.result && !obj.element && !xml))
      return obj.result || { error: 'Something went wrong in the parsing', startsAt: obj.error };
    if (obj.trash) array.push({ name: 'trash', element: obj.trash, attributes: {} });
    array.push(obj);
  }
  const sections = array.reduce((obj, { name, attributes, element = undefined }) => {
    const myEl = { attributes, element };
    if (!name) return obj;
    if (obj[name]) return { ...obj, [name]: [...obj[name], myEl] };
    else return { ...obj, [name]: [myEl] };
  }, {});

  const elements = Object.keys(sections).reduce((acc, key) => {
    const section = sections[key];
    let newAcc = { ...acc };

    // Only takes the first occurences.
    if (Object.values(section[0].attributes).length)
      newAcc = { ...newAcc, [`${key}_attr`]: section[0].attributes };

    if (section.length === 1) {
      const element = getElements(section[0].element);
      if (element && (typeof element !== 'object' || Object.values(element).length))
        return { ...newAcc, [key]: element };
    } else if (section.length) {
      const elements = section
        .map(({ element }) => element)
        .map(getElements)
        .filter(
          (element) => element && (typeof element !== 'object' || Object.values(element).length)
        );
      if (elements.length)
        return {
          ...newAcc,
          [key]: elements
        };
    }
    return acc;
  }, {});

  return elements;
};

const parse = (xml = '') => {
  xml = xml
    .replace(/\<\?xml(.*?)\?\>/gim, '')
    .replace(/\n/gim, '')
    .trim();
  if (!xml) return undefined;
  const obj = getElements(xml);
  return obj;
};

const p_parse = (xml) =>
  new Promise((res, rej) =>
    setTimeout((_) => {
      try {
        const obj = parse(xml);
        res(obj);
      } catch (e) {
        rej(e);
      }
    }, 0)
  );

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
  fromObject,
  p_parse
};

module.exports = XML;
