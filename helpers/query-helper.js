const prodDimensions = (productDetails) => {
    let weight = null;
    let length = null;
    let width = null;
    let height = null;
    let prodDimensions = productDetails.find("tr:contains('Product Dimensions') td:last-child").text();
    if (!prodDimensions) {
        prodDimensions = productDetails.find("tr:contains('Package Dimensions') td:last-child").text();
    }
    if (prodDimensions) {
        const prodDimensions1 = prodDimensions.split('; ');
        const dimensions = prodDimensions1[0].split('x');
        weight = prodDimensions1[1] ? prodDimensions1[1].trim() : null;
        length = dimensions[0] ? dimensions[0].trim() : null;
        width = dimensions[1] ? dimensions[1].trim() : null;
        height = dimensions[2] ? dimensions[2].replace('Centimeters', '').replace('cm', '').trim() : null;
    }
    return { weight, length, width, height };
}

const itemDimensions = (productDetails) => {
    let length = null;
    let width = null;
    let height = null;
    const itemDimensions = productDetails.find("tr:contains('Item Dimensions') td:last-child").text();
    if(itemDimensions) {
        const itemDimensions1 = itemDimensions.split('; ');
        const dimensions = itemDimensions1[0].split('x');
        length = dimensions[0] ? dimensions[0].trim() : null;
        width = dimensions[1] ? dimensions[1].trim() : null;
        height = dimensions[2] ? dimensions[2].replace('Centimeters', '').replace('cm', '').trim() : null;
    }
    return { length, width, height };
}
module.exports = { prodDimensions, itemDimensions };