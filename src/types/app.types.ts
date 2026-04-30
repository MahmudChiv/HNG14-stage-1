export interface JwtPayload {
  id: string;
  role: string;
}

export interface ProfileQueryBody {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
  sort_by?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export interface ExportProfile extends ProfileQueryBody {
  format?: "csv";
}

export interface SearchQuery {
  q?: string;
  limit?: number;
  page?: number;
}

export interface Country {
  country_id: string;
  probability: GLfloat;
}

export interface userProfileQuery {
  gender?: string;
  country_id?: string;
  age_group?: string;
}
