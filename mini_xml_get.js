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

const promisifyElements = (xml) =>
  new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const obj = await pGetElements(xml);
        resolve(obj);
      } catch (e) {
        reject(e);
      }
    }, 0);
  });

async function pGetElements(xml) {
  if (!xml) return undefined;
  const rex = /<(?<name>.*?)(\\b.*?>|>)(.*?)<\/(.*?)>/g;
  const res = rex.exec(xml.trim());
  if (!res || !res.length || !res['groups'] || !res['groups'].name) return xml.trim();
  const { name } = res['groups'];
  const [cleanName, ..._] = name.split(' ');
  // Sub elements are registered too.
  const elements = getXmlElementsByName(xml, cleanName);
  const attributes = getXmlAttributeByName(xml, cleanName);
  if ((!elements || !elements.length) && name !== cleanName && name[name.length - 1] === '/') {
    try {
      const rex2 = new RegExp(`<${name}>`, 'gmi');
      const newXml = xml.replace(rex2, '');
      if (attributes)
        return {
          [`${cleanName}_attr`]: attributes,
          [cleanName]: undefined,
          ...(await promisifyElements(newXml))
        };
      return await promisifyElements(newXml);
    } catch (e) {
      console.log({ name, attributes, cleanName });
      return undefined;
    }
  }
  let newXml = '';
  const rex2 = new RegExp(
    `<${name.replace(/\)/gim, '\\)').replace(/\(/gim, '\\(')}>(.*?)</${cleanName}>`,
    'gmi'
  );
  if (name[name.length - 1] === '/' && xml.trim().indexOf(`<${name}>`) === 0)
    newXml = xml.trim().replace(`<${name}>`, '');
  else newXml = xml.trim().replace(rex2, '');
  let newElem = await promisifyElements(newXml);
  if (typeof newElem === 'string') newElem = newElem.trim();
  if (!newElem) newElem = null;
  if (typeof newElem !== 'object') newElem = { trash: newElem };
  if (Object.keys(attributes || {}).length)
    if (elements.length > 1) {
      return {
        [cleanName]: await Promise.all(elements.map(promisifyElements)),
        [`${cleanName}_attr`]: attributes,
        ...newElem
      };
    } else
      return {
        [cleanName]: await promisifyElements(elements[0]),
        [`${cleanName}_attr`]: attributes,
        ...newElem
      };
  else if (elements.length > 1) {
    return { [cleanName]: await Promise.all(elements.map(promisifyElements)), ...newElem };
  } else return { [cleanName]: await promisifyElements(elements[0]), ...newElem };
}

const p_parse = async (xml = '') => {
  xml = xml
    .replace(/\<\?xml(.*?)\?\>/gim, '')
    .replace(/\n/gim, '')
    .trim();
  if (!xml) return undefined;
  const obj = await promisifyElements(xml);
  return obj;
};

function getElements(xml) {
  if (!xml) return undefined;
  const rex = /<(?<name>.*?)(\\b.*?>|>)(.*?)<\/(.*?)>/g;
  const res = rex.exec(xml.trim());
  if (!res || !res.length || !res['groups'] || !res['groups'].name) return xml.trim();
  const { name } = res['groups'];
  const [cleanName, ..._] = name.split(' ');
  // Sub elements are registered too.
  const elements = getXmlElementsByName(xml, cleanName);
  const attributes = getXmlAttributeByName(xml, cleanName);
  if ((!elements || !elements.length) && name !== cleanName && name[name.length - 1] === '/') {
    const rex2 = new RegExp(`<${name}>`, 'gmi');
    const newXml = xml.replace(rex2, '');
    if (attributes)
      return {
        [`${cleanName}_attr`]: attributes,
        [cleanName]: undefined,
        ...getElements(newXml)
      };
    return getElements(newXml);
  }
  const rex2 = new RegExp(`<${name}>(.*?)</${cleanName}>`, 'gmi');
  const newXml = xml.replace(rex2, '');
  let newElem = getElements(newXml);
  if (typeof newElem === 'string') newElem = newElem.trim();
  if (!newElem) newElem = null;
  if (typeof newElem !== 'object') newElem = { trash: newElem };
  if (Object.keys(attributes || {}).length)
    if (elements.length > 1) {
      return {
        [cleanName]: elements.map(getElements),
        [`${cleanName}_attr`]: attributes,
        ...newElem
      };
    } else
      return {
        [cleanName]: getElements(elements[0]),
        [`${cleanName}_attr`]: attributes,
        ...newElem
      };
  else if (elements.length > 1) {
    return { [cleanName]: elements.map(getElements), ...newElem };
  } else return { [cleanName]: getElements(elements[0]), ...newElem };
}

const parse = (xml = '') => {
  xml = xml
    .replace(/\<\?xml(.*?)\?\>/gim, '')
    .replace(/\n/gim, '')
    .trim();
  if (!xml) return undefined;
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
  fromObject,
  p_parse
};

module.exports = XML;
