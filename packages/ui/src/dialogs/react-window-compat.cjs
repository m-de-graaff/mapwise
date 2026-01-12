const ReactWindow = require("react-window");
// Handle potential default export wrapper which often happens in compiled CJS
const target = ReactWindow.default || ReactWindow;

module.exports = {
	FixedSizeList: target.FixedSizeList,
	VariableSizeList: target.VariableSizeList,
	FixedSizeGrid: target.FixedSizeGrid,
	VariableSizeGrid: target.VariableSizeGrid,
	shouldComponentUpdate: target.shouldComponentUpdate,
	default: target,
	__esModule: true,
};
