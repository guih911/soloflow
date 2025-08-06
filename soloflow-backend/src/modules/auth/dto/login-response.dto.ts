export class LoginResponseDto {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    companies: Array<{
      id: string;
      companyId: string;
      companyName: string;
      role: string;
      isDefault: boolean;
      sectorId?: string;
      sectorName?: string;
    }>;
    activeCompany: {
      id: string;
      companyId: string;
      companyName: string;
      role: string;
      sectorId?: string;
      sectorName?: string;
    };
  };
}
