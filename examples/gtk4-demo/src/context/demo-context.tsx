import { createContext, type ReactNode, useContext, useState } from "react";
import type { Category, Demo } from "../demos/types.js";

interface DemoContextValue {
    categories: Category[];
    currentDemo: Demo | null;
    currentCategory: Category | null;
    setCurrentDemo: (demo: Demo | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredCategories: Category[];
}

const DemoContext = createContext<DemoContextValue | null>(null);

export const useDemo = () => {
    const context = useContext(DemoContext);
    if (!context) {
        throw new Error("useDemo must be used within a DemoProvider");
    }
    return context;
};

interface DemoProviderProps {
    categories: Category[];
    children: ReactNode;
}

export const DemoProvider = ({ categories, children }: DemoProviderProps) => {
    const [currentDemo, setCurrentDemo] = useState<Demo | null>(categories[0]?.demos[0] ?? null);
    const [searchQuery, setSearchQuery] = useState("");

    const currentCategory = categories.find((cat) => cat.demos.some((d) => d.id === currentDemo?.id)) ?? null;

    const filteredCategories = searchQuery.trim()
        ? categories
              .map((cat) => ({
                  ...cat,
                  demos: cat.demos.filter(
                      (demo) =>
                          demo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          demo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          demo.keywords.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase())),
                  ),
              }))
              .filter((cat) => cat.demos.length > 0)
        : categories;

    return (
        <DemoContext.Provider
            value={{
                categories,
                currentDemo,
                currentCategory,
                setCurrentDemo,
                searchQuery,
                setSearchQuery,
                filteredCategories,
            }}
        >
            {children}
        </DemoContext.Provider>
    );
};
