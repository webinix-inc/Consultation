import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { Link } from "react-router-dom"; // or "next/link" if using Next.js

interface CustomBreadcrumbProps {
  items: {
    label: string;
    href: string;
  }[];
}

export function CustomBreadcrumb({ items }: CustomBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {items.map((item, index) => (
          <BreadcrumbItem key={index}>
            <BreadcrumbLink asChild>
              <Link to={item.href}>{item.label}</Link>
            </BreadcrumbLink>
            {index !== items.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
