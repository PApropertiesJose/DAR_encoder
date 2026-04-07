import { AppShell, Box, Card, Container, createTheme, Fieldset, Paper, rem, Select, Table, TextInput } from "@mantine/core";
import { MantineThemeOverride, MultiSelect } from "@mantine/core";

const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem("200px"),
  xs: rem("300px"),
  sm: rem("400px"),
  md: rem("500px"),
  lg: rem("600px"),
  xl: rem("1400px"),
  xxl: rem("1600px"),
};

export const darkTheme: MantineThemeOverride = createTheme({
  /* Using your Outfit and DM Mono variables */
  fontFamily: "var(--font-main), sans-serif",
  fontFamilyMonospace: "var(--font-mono), monospace",

  fontSizes: {
    xs: rem("12px"),
    sm: rem("14px"),
    md: rem("16px"),
    lg: rem("18px"),
    xl: rem("20px"),
    "2xl": rem("24px"),
    "3xl": rem("30px"),
    "4xl": rem("36px"),
    "5xl": rem("48px"),
  },
  spacing: {
    "3xs": rem("4px"),
    "2xs": rem("8px"),
    xs: rem("10px"),
    sm: rem("12px"),
    md: rem("16px"),
    lg: rem("20px"),
    xl: rem("24px"),
    "2xl": rem("28px"),
    "3xl": rem("32px"),
  },

  colors: {
    /* Your primary accent color scale */
    primary: [
      '#e6f3f3', // 0 - very light
      '#cce7e8', // 1
      '#99cfd1', // 2
      '#66b7ba', // 3
      '#339fa3', // 4
      '#00878c', // 5
      '#00595c', // 6 ← base color
      '#00484a', // 7
      '#003638', // 8
      '#002526', // 9 - very dark
    ],
  },

  primaryColor: "primary",
  white: "var(--text-primary)",
  black: "var(--shell-bg)",

  /* Global CSS variable resolver to ensure all components use dark variables */
  vars: (theme) => ({
    root: {
      "--mantine-color-body": "var(--shell-bg)",
      "--mantine-color-text": "var(--text-primary)",
      "--mantine-color-anchor": "var(--accent)",
      "--mantine-color-default-border": "var(--nav-border)",
      "--mantine-color-placeholder": "var(--text-faint)",
    },
  }),

  components: {
    AppShell: AppShell.extend({
      styles: {
        navbar: {
          backgroundColor: "var(--nav-bg)",
          borderRight: "1px solid var(--nav-border)",
        },
        header: {
          backgroundColor: "var(--nav-bg)",
          borderBottom: "1px solid var(--nav-border)",
          backdropFilter: "blur(16px)",
        },
        main: {
          backgroundColor: "var(--shell-bg)"
        }
      },
    }),

    Container: Container.extend({
      styles: {
        root: {}
      },
      vars: (_, { size, fluid }) => ({
        root: {
          "--container-size": fluid
            ? "100%"
            : size !== undefined && size in CONTAINER_SIZES
              ? CONTAINER_SIZES[size]
              : rem(size),
        },
      }),
    }),

    Paper: Paper.extend({
      styles: {
        root: {
          backgroundColor: "var(--nav-bg)",
          borderColor: "var(--nav-border)",
          color: "var(--text-primary)",
        }
      },
      defaultProps: {
        p: "md",
        shadow: "xl",
        radius: "md",
        withBorder: true,
      },
    }),

    TextInput: TextInput.extend({
      styles: {
        input: {
          color: "var(--text-primary)",
        },
        label: {
          color: "var(--text-muted)",
          fontWeight: 500,
        }
      }
    }),

    Table: Table.extend({
      styles: {
        thead: {
          backgroundColor: '#00595c',
        },
        tbody: {
          backgroundColor: "transparent"
        },
        th: {
          color: "white",
          borderBottom: "1px solid var(--nav-border)",
        },
        td: {
          borderBottom: "1px solid var(--nav-border)",
        }
      }
    }),

    Card: Card.extend({
      styles: {
        root: {
          backgroundColor: "rgba(255,255,255,0.03)",
          borderColor: "var(--nav-border)",
        }
      },
      defaultProps: {
        p: "xl",
        shadow: "xl",
        radius: "md",
        withBorder: true,
      },
    }),

    Fieldset: Fieldset.extend({
      styles: {
        root: {
          backgroundColor: "var(--nav-bg)",
          borderColor: "var(--nav-border)",
        },
        legend: {
          color: "var(--accent)",
          fontWeight: 600,
        }
      }
    }),

    /* Select & MultiSelect updated for Dark Mode */
    MultiSelect: MultiSelect.extend({
      styles: {
        input: {
          backgroundColor: "rgba(255,255,255,0.03)",
          borderColor: "var(--nav-border)",
          color: "var(--text-primary)",
        },
        dropdown: {
          backgroundColor: "#141927", // Using your dark menu bg
          borderColor: "var(--nav-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        },
        option: {
          "&[data-hovered]": {
            backgroundColor: "var(--item-hover)",
          },
        },
      },
      defaultProps: {
        checkIconPosition: "right",
      },
    }),

    Select: Select.extend({
      styles: {
        input: {
          backgroundColor: "rgba(255,255,255,0.03)",
          borderColor: "var(--nav-border)",
          color: "var(--text-primary)",
        },
        dropdown: {
          backgroundColor: "#141927",
          borderColor: "var(--nav-border)",
        },
        option: {
          "&[data-hovered]": {
            backgroundColor: "var(--item-hover)",
          },
        },
      },
      defaultProps: {
        checkIconPosition: "right",
      },
    }),
  },
});

export const theme: MantineThemeOverride = createTheme({
  /** Put your mantine theme override here */
  fontSizes: {
    xs: rem("12px"),
    sm: rem("14px"),
    md: rem("16px"),
    lg: rem("18px"),
    xl: rem("20px"),
    "2xl": rem("24px"),
    "3xl": rem("30px"),
    "4xl": rem("36px"),
    "5xl": rem("48px"),
  },
  spacing: {
    "3xs": rem("4px"),
    "2xs": rem("8px"),
    xs: rem("10px"),
    sm: rem("12px"),
    md: rem("16px"),
    lg: rem("20px"),
    xl: rem("24px"),
    "2xl": rem("28px"),
    "3xl": rem("32px"),
  },

  colors: {
    primary: [
      '#e6f3f3', // 0 - very light
      '#cce7e8', // 1
      '#99cfd1', // 2
      '#66b7ba', // 3
      '#339fa3', // 4
      '#00878c', // 5
      '#00595c', // 6 ← base color
      '#00484a', // 7
      '#003638', // 8
      '#002526', // 9 - very dark
    ],

  },

  primaryColor: "primary",
  white: "#f2f2f2",
  components: {
    AppShell: AppShell.extend({
      styles: {
        navbar: {
          backgroundColor: "#fefcfb",
          borderRight: "1px solid lightgray",
        },
        header: {
          backgroundColor: "#fefcfb",
          borderRight: "1px solid lightgray",
        },
        main: {
          backgroundColor: '#f8f9fa'
        }
      },
    }),
    /** Put your mantine component override here */
    Container: Container.extend({
      styles: {
        root: {}
      },
      vars: (_, { size, fluid }) => ({
        root: {
          "--container-size": fluid
            ? "100%"
            : size !== undefined && size in CONTAINER_SIZES
              ? CONTAINER_SIZES[size]
              : rem(size),
        },
      }),
    }),
    Paper: Paper.extend({
      styles: {
        root: {
          backgroundColor: '#fefcfb'
        }
      },
      defaultProps: {
        p: "md",
        shadow: "xl",
        radius: "md",
        withBorder: true,

      },
    }),

    TextInput: TextInput.extend({
      styles: {
        input: {
          backgroundColor: 'white'
        }
      }
    }),

    Table: Table.extend({
      defaultProps: {
      },
      styles: {
        thead: {
          backgroundColor: '#00595c',
          color: '#fefcfb'
        },
        tbody: {
          backgroundColor: '#fefcfb'
        }
      }

    }),

    Card: Card.extend({
      defaultProps: {
        p: "xl",
        shadow: "xl",
        radius: "var(--mantine-radius-default)",
        withBorder: true,
      },
    }),

    Fieldset: Fieldset.extend({
      styles: {
        root: {
          backgroundColor: '#fefcfb'
        }
      }
    }),

    MultiSelect: MultiSelect.extend({
      styles: (theme) => ({
        input: {
          backgroundColor: "#fff",
          padding: "4px 8px", // control input padding
        },

        dropdown: {
          padding: 0, // remove outer padding
          backgroundColor: "#fff",
        },

        options: {
          padding: 0,
          margin: 0,
        },

        option: {
          padding: "6px 8px", // 👈 adjust or set to 0 if you want tight list
          borderRadius: 0,
        },
      }),

      defaultProps: {
        checkIconPosition: "right",
      },
    }),
    Select: Select.extend({
      styles: (theme) => ({
        input: {
          backgroundColor: "#fff",
          padding: "4px 8px", // control input padding
        },

        dropdown: {
          padding: 0, // remove outer padding
          backgroundColor: "#fff",
        },

        options: {
          padding: 0,
          margin: 0,
        },

        option: {
          padding: "6px 8px", // 👈 adjust or set to 0 if you want tight list
          borderRadius: 0,
        },
      }),

      defaultProps: {
        checkIconPosition: "right",
      },
    }),
  },
})
