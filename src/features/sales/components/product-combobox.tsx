"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProductOption {
    id: number;
    name: string;
    price: number;
    sku: string;
}

interface ProductComboboxProps {
    products: ProductOption[];
    value?: string;
    onSelect: (productId: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ProductCombobox({ products, value, onSelect, placeholder = "Select...", disabled = false }: ProductComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [coords, setCoords] = React.useState({ left: 0, top: 0, width: 0 });
    const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        setPortalContainer(document.body);
    }, []);

    // Sync "Search" input with the selected value's name when closed or value changes
    React.useEffect(() => {
        if (!open && value) {
            const selected = products.find(p => p.id.toString() === value);
            if (selected) {
                setSearch(`${selected.sku} - ${selected.name}`);
            } else {
                setSearch("");
            }
        } else if (!open && !value) {
            setSearch("");
        }
    }, [open, value, products]);

    const updatePosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setCoords({
                left: rect.left + window.scrollX,
                top: rect.bottom + window.scrollY + 4,
                width: rect.width
            });
        }
    };

    const handleFocus = () => {
        if (disabled) return;
        updatePosition();
        setOpen(true);
        inputRef.current?.select();
    };

    const filteredProducts = products.filter((product) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return product.name.toLowerCase().includes(term) ||
            product.sku.toLowerCase().includes(term);
    });

    return (
        <div className="relative w-full">
            <div className="relative">
                <Input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={handleFocus}
                    onClick={handleFocus}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="pr-8"
                />
                <ChevronsUpDown className="absolute right-2 top-2.5 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            </div>

            {open && portalContainer && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9990] bg-transparent"
                        onClick={() => setOpen(false)}
                    />

                    <div
                        className="absolute z-[9999] rounded-md border bg-white shadow-lg animate-in fade-in-0 zoom-in-95"
                        style={{
                            left: coords.left,
                            top: coords.top,
                            width: coords.width,
                            maxHeight: "300px",
                        }}
                    >
                        <ul className="max-h-[300px] overflow-auto py-1">
                            {filteredProducts.length === 0 ? (
                                <li className="px-4 py-2 text-sm text-muted-foreground text-center">
                                    No products found.
                                </li>
                            ) : (
                                filteredProducts.map((product) => (
                                    <li
                                        key={product.id}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-slate-100 hover:text-slate-900",
                                            value === product.id.toString() && "bg-slate-100 font-medium"
                                        )}
                                        onClick={() => {
                                            onSelect(product.id.toString());
                                            setOpen(false);
                                        }}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span>
                                                <span className="font-semibold">{product.sku}</span>
                                                <span className="mx-2 text-muted-foreground">-</span>
                                                {product.name}
                                            </span>
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Price: {product.price} EGP</span>
                                            </div>
                                        </div>
                                        {value === product.id.toString() && (
                                            <Check className="ml-auto h-4 w-4 text-primary" />
                                        )}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </>,
                portalContainer
            )}
        </div>
    );
}
