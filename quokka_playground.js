import XML from './mini_xml_get';
import fs from 'fs';

// read file
const xmlFile = fs
  .readFileSync(__dirname + '/test.xml', 'utf8')
  .replace(/\t/gi, '')
  .replace(/\n/gi, '');
const bigXmlFile = await fs
  .readFileSync(__dirname + '/500mo_test.xml', 'utf8')
  .replace(/\t/gi, '')
  .replace(/\n/gi, '');

console.log({ bigXmlFile: bigXmlFile.length, done: true });

const cart = {
  prestashop: {
    cart: {
      id_address_delivery: '9',
      id_address_invoice: '9',
      id_currency: '1',
      id_country: '8',
      id_customer: '1',
      id_lang: '1',
      id_carrier: '3',
      module: 'ps_checkpayment',
      current_state: '2',
      associations: {
        cart_rows: [
          {
            cart_row: {
              id_product: '19',
              id_product_attribute: '0',
              id_address_delivery: '9',
              quantity: 1
            }
          },
          {
            cart_row: {
              id_product: '19',
              id_product_attribute: '0',
              id_address_delivery: '9',
              quantity: 2
            }
          },
          {
            cart_row: {
              id_product: '1',
              id_product_attribute: '1',
              id_address_delivery: '9',
              quantity: 1
            }
          }
        ]
      }
    }
  }
};

const test = async (_) => {
  console.log('commencing:');
  const elements = XML.p_parse(bigXmlFile);
  // const elements = XML.getXmlElementsByName(bigXmlFile, 'row_cart');
  console.log('done!');
  // console.log(elements);
  console.log(JSON.stringify(await elements, null, 4));
  // const fromObject = XML.fromObject(cart);
  // console.log(JSON.stringify(fromObject, null, 4));
};

test();
