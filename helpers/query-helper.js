const prodDimensions = (productDetails) => {
    const prodDimensions = productDetails.find("tr:contains('Product Dimensions') td:last-child").text();
    const prodDimensions1 = prodDimensions.split('; ');
    const dimensions = prodDimensions1[0].split('x');
    const weight = prodDimensions1[1] ? prodDimensions1[1].trim() : null;
    const length = dimensions[0] ? dimensions[0].trim() : null;
    const width = dimensions[1] ? dimensions[1].trim() : null;
    const height = dimensions[2] ? dimensions[2].replace('Centimeters', '').replace('cm', '').trim() : null;
    return { weight, length, width, height };
}

const itemDimensions = (productDetails) => {
    const itemDimensions = productDetails.find("tr:contains('Item Dimensions') td:last-child").text();
    const itemDimensions1 = itemDimensions.split('; ');
    const dimensions = itemDimensions1[0].split('x');
    const length = dimensions[0] ? dimensions[0].trim() : null;
    const width = dimensions[1] ? dimensions[1].trim() : null;
    const height = dimensions[2] ? dimensions[2].replace('Centimeters', '').replace('cm', '').trim() : null;
    return { length, width, height };
}
module.exports = { prodDimensions, itemDimensions };