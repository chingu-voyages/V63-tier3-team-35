import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export const useHomePage = () => {
  const router = useRouter();
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [dataset, setDataset] = useState("sample");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    localStorage.setItem(
      "guestOrganizer",
      JSON.stringify({ organization, role, dataset }),
    );
    router.push("/events");
  };

  return {
    organization,
    setOrganization,
    role,
    setRole,
    dataset,
    setDataset,
    handleSubmit,
  };
};
