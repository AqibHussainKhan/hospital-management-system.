import DepartmentRecords from "../../components/administration/DepartmentRecords";
export default function DepartmentPage({ onLogout }: { onLogout: () => void }) { return <DepartmentRecords kind="tests" onLogout={onLogout}/>; }
