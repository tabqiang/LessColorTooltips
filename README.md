A tool to display color tooltips in Less files

## Features

- Display color tooltips in `.less` and `.vue` files
- Supports `#RRGGBB`, `#RGB`, and `rgba()` color formats
- Searches for color properties from specified file paths and displays them in tooltips

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing `Ctrl+Shift+X`
3. Search for `LessColorTooltip`
4. Click `Install` to install the extension

## Usage

1. Open a `.less` or `.vue` file
2. Hover over a color value (e.g., `#RRGGBB`, `#RGB`, or `rgba()`)
3. If the color is defined in the specified file paths, a tooltip with the color properties will be displayed

## Configuration

Add the following configuration in the VS Code settings to specify the file paths for searching color properties and variables:

```json
{
  "lessColorTooltip.themePath": "path/to/your/theme/file",
  "lessColorTooltip.variablePath": "path/to/your/variable/file"
}
```