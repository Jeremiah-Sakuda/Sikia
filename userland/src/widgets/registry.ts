export const widgetRegistry = [
  {
    id: "hello",
    render() {
      const section = document.createElement("section");
      section.dataset.widget = "hello";
      section.textContent = "Hello from Sikia userland";
      return section;
    },
  },
];
