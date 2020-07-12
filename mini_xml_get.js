const getTargetElements = (xml, name) => {
  const rex = new RegExp(`<${name}(\\b.*?>|>)(.*?)</${name}>`, 'gm');
  const elements = xml.match(rex);
  return elements || [];
};

export const getXmlElementsByName = (xml, name) => {
  if (!xml || !name) return [];
  const elements = getTargetElements(xml, name);
  const purifiedElems = elements.map(elem =>
    elem.replace(new RegExp(`<${name}(\\b.*?>|>)(.*?)`), '').replace(`</${name}>`, '')
  );
  return purifiedElems || [];
};

export const getXmlElementByName = (xml, name) => getXmlElementsByName(xml, name)[0];

export const objifyElementsByNames = (xml, names = []) => {
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

export const cleanedObjifyElementsByNames = (xml, names = []) =>
  objifyElementsByNames(xml, names)[0];

export const getXmlSectionsByNames = (xml, names = []) =>
  names.reduce((_, name) => _ && getXmlElementsByName(_, name)[0], xml);

export const getXmlSectionByNames = (xml, names = []) => getXmlSectionsByNames(xml, names)[0];

const objifyAttr = (attributes, obj = {}) => {
  if (!attributes) return obj;
  const rex = /(.*?)="(.*?)"/gim;
  const res = rex.exec(attributes);
  const [fetched, key, value] = res || [];
  const rest = attributes.replace(fetched, '');
  if (!rest) return { ...obj, [key.trim()]: value };
  return objifyAttr(rest, { ...obj, [key.trim()]: value });
};

export const getXmlAttributesByName = (xml, name) => {
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

export const getXmlAttributeByName = (xml, name) => getXmlAttributesByName(xml, name)[0];

const getElements = xml => {
  if (!xml) return {};
  const rex = /<(?<name>.*?)(\s.*?>|>)(.*?)<\/(.*?)>/g;
  const res = rex.exec(xml);
  if (!res || !res.length || !res['groups'] || !res['groups'].name) return xml;
  const { name } = res['groups'];
  // console.log({ elements, groups: elements['groups'] });
  const elements = getXmlElementsByName(xml, name);
  const attributes = getXmlAttributeByName(xml, name);
  // console.log({ name, elements });
  // const newXML = xml.replace(new RegExp(`<${name}(.*?)>`), '').replace(new RegExp(`(.*?)</${name}>`), '');
  const newXml = xml.replace(new RegExp(`<${name}(\\b.*?>|>)(.*?)</${name}>`), '');
  let newElem = getElements(newXml);
  if (typeof newElem !== 'object') newElem = { trash: newElem };
  // console.log({ newElem });
  // console.log({ elements });
  // console.log({ name });
  if (Object.keys(attributes || {}).length)
    if (elements.length > 1) {
      // console.log({ length: elements.length });
      return {
        [name]: [elements.map(getElements)],
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
    // console.log({ length: elements.length });
    return { [name]: [elements.map(getElements)], ...newElem };
  } else return { [name]: getElements(elements[0]), ...newElem };
};

export const parse = xml => {
  xml = xml.replace(/\<\?xml(.*?)\?\>/gim, '');
  const elements = getElements(xml);
  return elements;
  // console.log({ elements });
  // console.log(JSON.stringify(elements, null, 4));
};
