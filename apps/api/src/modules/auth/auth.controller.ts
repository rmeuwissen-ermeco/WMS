import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { parseOrThrow, z } from "../../common/zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown) {
    const dto = parseOrThrow(LoginSchema, body);
    return this.auth.login(dto.email, dto.password);
  }
}