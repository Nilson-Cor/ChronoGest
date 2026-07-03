import { Controller, Post, Get, Patch, Body, Res, Req, UseGuards, Request } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../application/dtos/login.dto';
import { RegisterDto } from '../../application/dtos/register.dto';
import { Public } from '../../public.decorator';
import type { Response, Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../jwt-auth.guard';
import { Acceso } from '../../../accesos/infrastructure/persistence/acceso.entity';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

    private get accesoRepo(): Repository<Acceso> {
        return CentroTenantContextService.getEpsasDataSource().getRepository(Acceso);
    }

    @Public()
    @Post('register')
    async registrar(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
        const dto: LoginDto = { login: body.login ?? body.identifier, password: body.password };
        return this.authService.login(dto, res);
    }

    /**
     * Login que NO requiere el header x-centro-tenant ni que el usuario
     * sepa el slug de su Centro de Formación: se busca automaticamente en
     * que tenant existen esas credenciales. Excluido de CentroTenantMiddleware
     * (ver PREFIJOS_SIN_TENANT) porque justamente todavia no se sabe el tenant.
     */
    @Public()
    @Post('login-auto')
    loginAuto(@Body() body: any, @Res({ passthrough: true }) res: Response) {
        const dto: LoginDto = { login: body.login ?? body.identifier, password: body.password };
        return this.authService.loginAuto(dto, res);
    }

    @Public()
    @Get('validar-token')
    validarToken(@Req() req: ExpressRequest) {
        const token = req.cookies?.token ?? (req.headers.authorization?.split(' ')[1]);
        return this.authService.validarToken(token);
    }

    @Get('me')
    me(@Request() req: any) { return req.user; }

    @Post('logout')
    async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
        const token = (req.headers.authorization?.split(' ')[1]) ?? req.cookies?.token;
        if (token) {
            try {
                await this.accesoRepo.update({ token }, { fechaSalida: new Date(), estado: 'inactivo' as any });
            } catch (_) {}
        }
        res.clearCookie('token');
        return { message: 'Sesión cerrada' };
    }

    @Patch('cambiar-password')
    async cambiarPassword(@Req() req: ExpressRequest, @Body() body: { passwordActual: string; passwordNuevo: string }) {
        const token = req.cookies?.token ?? (req.headers.authorization?.split(' ')[1]);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        await this.authService.cambiarPassword(payload.login, body.passwordActual, body.passwordNuevo);
        return { mensaje: 'Contraseña actualizada correctamente' };
    }

    @Public()
    @Post('forgot-password')
    async forgotPassword(@Body() body: { correo: string }) {
        await this.authService.forgotPassword(body.correo);
        // Siempre responde igual para no revelar si el correo existe
        return { message: 'Si el correo está registrado recibirás un código de verificación en los próximos minutos.' };
    }

    @Public()
    @Post('verify-reset-code')
    async verifyResetCode(@Body() body: { correo: string; code: string }) {
        await this.authService.verifyResetCode(body.correo, body.code);
        return { message: 'Código válido' };
    }

    @Public()
    @Post('reset-password')
    async resetPassword(@Body() body: { correo: string; code: string; newPassword: string }) {
        await this.authService.resetPassword(body.correo, body.code, body.newPassword);
        return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
    }
}
